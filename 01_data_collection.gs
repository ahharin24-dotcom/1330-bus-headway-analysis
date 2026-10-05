const SPREADSHEET_ID = "1u4Exbv_0v7kb554OtMt_VwpzP32-dqL2RSJQGxMcr8Y";
const SHEET_NAME = "데이터";

const STATIONS = {
  "청평터미널": "239000738",
  "마석역": "222000010"
};

const TARGET_ROUTES = [
  "1330-2",
  "1330-3",
  "1330-4",
  "1330-44"
];

const SEOUL_DESTINATIONS = {
  "1330-2": "현대코아",
  "1330-3": "현대코아",
  "1330-4": "청량리역환승센터",
  "1330-44": "청량리역환승센터"
};

const BASE_URL =
  "https://apis.data.go.kr/6410000/busarrivalservice/v2/getBusArrivalListv2";


// =====================================================
// 실제 버스 데이터 수집
// =====================================================
function collectBusData() {

  const now = new Date();

  const weekday = Number(
    Utilities.formatDate(now, "Asia/Seoul", "u")
  );

  const hour = Number(
    Utilities.formatDate(now, "Asia/Seoul", "H")
  );

  const minute = Number(
    Utilities.formatDate(now, "Asia/Seoul", "m")
  );


  // ① 월~금만
  if (weekday > 5) {
    console.log("주말 → 수집 안 함");
    return;
  }


  // ③ 06:00 ~ 20:59까지만 수집
  // API 호출량 보호용
  if (hour < 6 || hour >= 21) {
    console.log("수집 시간 아님");
    return;
  }


  // ④ 트리거는 1분마다 실행되지만
  // 짝수 분에만 실제 API 호출 → 약 2분 간격
  if (minute % 2 !== 0) {
    return;
  }


  const serviceKey =
    PropertiesService
      .getScriptProperties()
      .getProperty("BUS_API_KEY");

  if (!serviceKey) {
    throw new Error(
      "BUS_API_KEY가 없습니다. 프로젝트 설정에서 API 키를 등록하세요."
    );
  }


  const ss =
    SpreadsheetApp.openById(SPREADSHEET_ID);

  let sheet =
    ss.getSheetByName(SHEET_NAME);


  // 데이터 시트가 없으면 자동 생성
  if (!sheet) {

    sheet =
      ss.insertSheet(SHEET_NAME);

    sheet.appendRow([
      "recorded_at",
      "station_name",
      "station_id",
      "route_name",
      "route_id",
      "direction",
      "destination",
      "arrival_order",
      "predict_time_min",
      "predict_time_sec",
      "vehicle_id",
      "plate_no",
      "location_no",
      "state_cd",
      "flag"
    ]);
  }


  let allRows = [];


  for (
    const [stationName, stationId]
    of Object.entries(STATIONS)
  ) {

    const rows =
      getStationArrivals(
        serviceKey,
        stationName,
        stationId
      );

    allRows =
      allRows.concat(rows);
  }


  if (allRows.length > 0) {

    sheet
      .getRange(
        sheet.getLastRow() + 1,
        1,
        allRows.length,
        allRows[0].length
      )
      .setValues(allRows);

    console.log(
      "✅ 저장 완료:",
      allRows.length,
      "rows"
    );

  } else {

    console.log(
      "현재 저장할 서울방향 차량 없음"
    );
  }
}


// =====================================================
// 정류장 도착정보 API
// =====================================================
function getStationArrivals(
  serviceKey,
  stationName,
  stationId
) {

  const url =
    BASE_URL +
    "?serviceKey=" +
    serviceKey +
    "&stationId=" +
    stationId +
    "&format=json";


  const response =
    UrlFetchApp.fetch(
      url,
      {
        muteHttpExceptions: true
      }
    );


  const status =
    response.getResponseCode();


  console.log(
    stationName,
    "HTTP",
    status
  );


  if (status !== 200) {

    console.log(
      response.getContentText()
    );

    return [];
  }


  const data =
    JSON.parse(
      response.getContentText()
    );


  const body =
    data.response &&
    data.response.msgBody
      ? data.response.msgBody
      : {};


  let items =
    body.busArrivalList || [];


  if (!Array.isArray(items)) {
    items = [items];
  }


  const nowString =
    Utilities.formatDate(
      new Date(),
      "Asia/Seoul",
      "yyyy-MM-dd HH:mm:ss"
    );


  let rows = [];


  for (const item of items) {

    const routeName =
      String(
        item.routeName || ""
      ).trim();


    // 네 개 노선만
    if (
      !TARGET_ROUTES.includes(routeName)
    ) {
      continue;
    }


    const destination =
      String(
        item.routeDestName || ""
      ).trim();


    const targetDestination =
      SEOUL_DESTINATIONS[routeName];


    // 서울방향만
    if (
      !destination.includes(
        targetDestination
      )
    ) {
      continue;
    }


    // 첫 번째/두 번째 도착예정 차량
    for (const order of [1, 2]) {

      const predictSec =
        item[
          "predictTimeSec" + order
        ];

      const vehicleId =
        item[
          "vehId" + order
        ];


      // 실제 예측정보 없는 빈 row는 저장하지 않음
      if (
        predictSec === undefined ||
        predictSec === null ||
        predictSec === "" ||
        vehicleId === undefined ||
        vehicleId === null ||
        vehicleId === ""
      ) {
        continue;
      }


      rows.push([

        nowString,

        stationName,

        stationId,

        routeName,

        item.routeId || "",

        "서울방향",

        destination,

        order,

        item[
          "predictTime" + order
        ] || "",

        predictSec,

        vehicleId,

        item[
          "plateNo" + order
        ] || "",

        item[
          "locationNo" + order
        ] || "",

        item[
          "stateCd" + order
        ] || "",

        item.flag || ""

      ]);
    }
  }


  return rows;
}


// =====================================================
// 1분 자동 트리거 생성
// → 실제 API 호출은 짝수 분에만 해서 약 2분 간격
// =====================================================
function createTrigger() {

  const triggers =
    ScriptApp.getProjectTriggers();


  // 중복 트리거 제거
  for (const trigger of triggers) {

    if (
      trigger.getHandlerFunction()
      === "collectBusData"
    ) {

      ScriptApp.deleteTrigger(
        trigger
      );
    }
  }


  ScriptApp
    .newTrigger(
      "collectBusData"
    )
    .timeBased()
    .everyMinutes(1)
    .create();


  console.log(
    "✅ 자동수집 트리거 생성 완료"
  );
}
function testCollectBusData() {

  const serviceKey =
    PropertiesService
      .getScriptProperties()
      .getProperty("BUS_API_KEY");

  if (!serviceKey) {
    throw new Error("BUS_API_KEY가 없습니다.");
  }

  const ss =
    SpreadsheetApp.openById(SPREADSHEET_ID);

  let sheet =
    ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);

    sheet.appendRow([
      "recorded_at",
      "station_name",
      "station_id",
      "route_name",
      "route_id",
      "direction",
      "destination",
      "arrival_order",
      "predict_time_min",
      "predict_time_sec",
      "vehicle_id",
      "plate_no",
      "location_no",
      "state_cd",
      "flag"
    ]);
  }

  let allRows = [];

  for (const [stationName, stationId] of Object.entries(STATIONS)) {
    const rows =
      getStationArrivals(serviceKey, stationName, stationId);

    allRows = allRows.concat(rows);
  }

  if (allRows.length > 0) {
    sheet
      .getRange(
        sheet.getLastRow() + 1,
        1,
        allRows.length,
        allRows[0].length
      )
      .setValues(allRows);

    console.log("✅ 테스트 성공:", allRows.length, "rows 저장");
  } else {
    console.log("⚠️ API 호출은 됐지만 현재 저장할 서울방향 차량이 없음");
  }
}
