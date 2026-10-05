# 1330 버스 중복구간 배차 불균형 분석

가평군 1330번대 버스의 중복 운행구간을 대상으로
실시간 버스 도착 데이터를 수집하고 Headway(배차간격)를 분석하여
배차 불균형 패턴과 개선 가능성을 분석한 프로젝트입니다.

## 파일 구성

- `01_data_collection.gs`
  - 경기도 버스도착정보 OpenAPI를 이용한 실시간 버스 데이터 수집
  - Google Apps Script를 통해 약 2분 간격으로 데이터를 수집하여 Google Sheets에 저장

- `02_arrival_event_method.ipynb`
  - 공통 정류장 및 관측지점 선정
  - 실시간 수집 데이터 전처리
  - 운행 Episode 생성
  - 청평터미널–마석역 Episode 매칭
  - 최종 도착 Event 판정

- `03_headway_analysis.ipynb`
  - 최종 도착 Event 기반 Headway 산출
  - 배차 불균형 분석
  - 시간대 및 노선조합별 패턴 분석
  - 배차 조정 시뮬레이션

## API 설정

실시간 데이터 수집에는 공공데이터포털의
`경기도_버스도착정보 조회` OpenAPI를 사용합니다.

API 인증키는 보안을 위해 소스코드에 포함하지 않았습니다.

Google Apps Script의 Script Properties에
`BUS_API_KEY`라는 이름으로 본인의 API 인증키를 등록한 후 실행할 수 있습니다.

## 주요 분석 환경

- Python
- Google Colab
- pandas
- NumPy
- Matplotlib
- Google Apps Script
- Google Sheets
