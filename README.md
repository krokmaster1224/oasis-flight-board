# oasis-flight-board

# Notion용 오아시스 항공편 상황판

2027년 5월 18일 출국, 5월 24일 귀국 일정에 맞춘 간결한 GitHub Pages 위젯입니다. 맨체스터와 런던행 항공편 중 가격이 가장 낮은 일정 2개와 총 소요 시간이 가장 짧은 일정 2개를 보여주며, 네이버 항공권·Trip.com·Skyscanner의 검색 결과로 연결합니다.

## 현재 데이터와 업데이트 방식

`data/latest.json`에는 2026년 11월 12일(KST)에 직접 확인한 항공권 가격 정보가 들어 있습니다. 상황판은 이 가격 정보의 확인 시각과 매시간 실행되는 업데이트 시각을 따로 표시합니다. 승인된 항공권 데이터 피드가 설정되지 않은 경우, 예약된 워크플로는 기존 가격 정보를 그대로 둡니다. 이 경우 상황판에도 그렇게 표시하며, 사이트 배포 시각을 새 항공권 조회 시각처럼 보여주지 않습니다. 상황판의 새로고침 버튼은 마지막으로 게시된 JSON을 다시 불러올 뿐, 항공권 플랫폼에 새 검색을 요청하지 않습니다.

위젯은 JSON을 매시간 다시 불러오며 GitHub Actions 워크플로도 사이트를 매시간 배포합니다. 항공권 가격까지 자동으로 갱신하려면 저장소의 Actions secret으로 `FLIGHT_BOARD_FEED_URL`을 설정하세요. 해당 주소는 `data/latest.json`과 같은 정규화된 형식의 JSON을 반환해야 하며, 승인된 네이버·Trip.com·Skyscanner 데이터 접근 방식만을 통해 가격을 가져와야 합니다. 피드에서 bearer token 인증을 사용하는 경우 `FLIGHT_BOARD_FEED_TOKEN`도 별도 secret으로 설정하세요. 새로고침 스크립트는 응답을 사용하기 전에 성인 수, 지정된 날짜, 현지 출발 시각 범위, 데이터 출처 이름이 맞는지 확인합니다.

이 세 소비자용 항공권 검색 사이트는 정적 웹사이트가 공통으로 호출할 수 있는 공개 가격 피드를 제공하지 않습니다. Skyscanner의 공식 Live Prices 예시는 `x-api-key` 헤더에 API 키를 전달합니다([Skyscanner API 빠른 시작](https://developers.skyscanner.net/docs/flights-live-prices/quick-start)). 네이버의 공개 API 목록에는 네이버 항공권 검색이 없습니다([네이버 API 목록](https://developers.naver.com/products/intro/plan/plan.md)). Trip.com 개발자 포털의 API 정보는 발급된 계정으로 로그인해야 확인할 수 있습니다([Trip.com Developers](https://developers.trip.com/?lang=en-US)). 항공사·플랫폼 인증 정보를 `index.html`에 넣거나 저장소에 커밋하지 마세요.

## GitHub Pages에 게시하기

1. `oasis-flight-board`라는 이름으로 GitHub 저장소를 만듭니다.
2. 이 폴더의 파일을 저장소 `main` 브랜치에 올립니다. 이 폴더를 연 터미널에서 다음 명령을 실행하세요.

   ```sh
   git init -b main
   git add .
   git commit -m "Add Oasis flight board"
   git remote add origin https://github.com/YOUR-ACCOUNT/oasis-flight-board.git
   git push -u origin main
   ```

   `YOUR-ACCOUNT`를 본인의 GitHub 사용자 이름으로 바꾸고, `.github/workflows/hourly-refresh.yml` 파일도 빠짐없이 올리세요.
3. 저장소의 **Settings → Pages → Build and deployment**에서 **GitHub Actions**를 선택합니다.
4. **Settings → Secrets and variables → Actions**에서 승인된 항공권 제공자 또는 집계 서비스의 피드가 준비된 경우에만 `FLIGHT_BOARD_FEED_URL`을 추가합니다. 피드에 인증 토큰이 필요한 경우에만 `FLIGHT_BOARD_FEED_TOKEN`도 추가하세요. 두 secret을 설정하지 않아도 사이트는 배포되지만, 항공권 가격은 날짜가 표시된 기존 스냅샷으로 유지됩니다.
5. **Actions** 탭에서 **Hourly flight board refresh**를 한 번 실행한 다음, GitHub Pages 주소를 엽니다. 매시간 정각의 혼잡을 줄이기 위해 예약 실행은 매시 17분에 시작합니다. GitHub 안내에 따르면 부하가 큰 경우 예약 실행이 지연되거나 누락될 수 있습니다([GitHub 예약 이벤트 문서](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)).
6. Notion에서 **Embed** 블록을 추가하고 GitHub Pages 주소를 붙여 넣습니다. 블록 크기를 조정해 간결한 전체 너비 패널로 배치하세요.

비공개 저장소를 사용하려면 현재 계정과 요금제에서 GitHub Pages를 사용할 수 있는지, 게시된 페이지를 인증 없이 Notion에 임베드할 수 있는지 확인하세요. 외부에서 접속할 수 있는 Pages 주소를 사용하면 표시된 여행 날짜와 노선도 공개됩니다.

## 피드 데이터 형식

`query`와 `offers`가 포함된 객체를 반환해야 합니다. 필드 이름과 ISO 시각 형식은 `data/latest.json`을 따르세요. 출발 및 도착 시각에는 해당 공항의 현지 시간대 오프셋을 포함해야 합니다. 각 운임에는 `Naver`, `Trip.com`, `Skyscanner` 중 하나인 `platform`, `pricePerPersonKRW`, 유효한 제공자 검색 URL이 있어야 합니다. `totalForTwoKRW`와 `fareNote`는 선택 항목입니다.

예시:

```json
{
  "query": {
    "adults": 2,
    "outboundDate": "2027-05-18",
    "returnDate": "2027-05-24"
  },
  "offers": []
}
```

위젯에는 5월 18일 한국 시간 20:00 이후 출발하고, 5월 24일 영국 현지 시간 12:00부터 17:59 사이에 출발하는 귀국편만 표시됩니다. 제공자가 2인 총액을 명시하지 않는 한 운임은 성인 1명 기준으로 표시됩니다. 최종 가격과 좌석 가능 여부는 연결된 판매처 페이지에서 반드시 확인하세요.
