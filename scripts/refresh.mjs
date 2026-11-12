import { readFile, writeFile } from 'node:fs/promises';

const file = new URL('../data/latest.json', import.meta.url);
const now = new Date().toISOString();
const data = JSON.parse(await readFile(file, 'utf8'));
const allowedPlatforms = new Set(['Naver', 'Trip.com', 'Skyscanner']);

function validate(payload) {
  if (payload?.query?.outboundDate !== '2027-05-18' || payload?.query?.returnDate !== '2027-05-24' || payload?.query?.adults !== 2) {
    throw new Error('Feed must use 2027-05-18 / 2027-05-24 and exactly 2 adults.');
  }
  if (!Array.isArray(payload.offers)) throw new Error('Feed is missing offers[].');
  const offers = payload.offers.filter(offer => {
    const out = new Date(offer?.outbound?.departureAt);
    const ret = new Date(offer?.return?.departureAt);
    if (Number.isNaN(out.getTime()) || Number.isNaN(ret.getTime())) return false;
    const outClock = offer.outbound.departureAt.slice(11,16);
    const retClock = offer.return.departureAt.slice(11,16);
    const timeOk = offer.outbound.departureAt.startsWith('2027-05-18') && outClock >= '20:00'
      && offer.return.departureAt.startsWith('2027-05-24') && retClock >= '12:00' && retClock < '18:00';
    if (!timeOk) return false;
    if (!Array.isArray(offer.fares)) return false;
    offer.fares = offer.fares.filter(fare => allowedPlatforms.has(fare.platform) && Number.isFinite(fare.pricePerPersonKRW) && fare.searchUrl);
    return offer.fares.length > 0;
  });
  if (offers.length === 0) throw new Error('Feed returned no flights satisfying the fixed date and departure-time rules.');
  return {...payload, offers, lastSuccessfulSearchAt: now, refreshStatus: {connected:true,lastAttemptAt:now,message:`${offers.length}개 조건 일치 일정 확인`}};
}

const endpoint = process.env.FLIGHT_BOARD_FEED_URL;
if (!endpoint) {
  data.refreshStatus = {
    connected: false,
    lastAttemptAt: now,
    message: 'FLIGHT_BOARD_FEED_URL 미설정. 기존 가격 스냅샷 유지.'
  };
  await writeFile(file, JSON.stringify(data, null, 2) + '\n');
  console.log('No approved feed configured; kept the last successful fare snapshot unchanged.');
  process.exit(0);
}

try {
  const headers = {accept:'application/json'};
  if (process.env.FLIGHT_BOARD_FEED_TOKEN) headers.authorization = `Bearer ${process.env.FLIGHT_BOARD_FEED_TOKEN}`;
  const response = await fetch(endpoint, {headers, signal:AbortSignal.timeout(45000)});
  if (!response.ok) throw new Error(`Feed returned HTTP ${response.status}.`);
  const refreshed = validate(await response.json());
  await writeFile(file, JSON.stringify(refreshed, null, 2) + '\n');
  console.log(`Published ${refreshed.offers.length} qualifying offers.`);
} catch (error) {
  data.refreshStatus = {connected:false,lastAttemptAt:now,message:`가격 피드 실패: ${String(error.message || error).slice(0,180)}. 기존 스냅샷 유지.`};
  await writeFile(file, JSON.stringify(data, null, 2) + '\n');
  console.error(data.refreshStatus.message);
  process.exitCode = 0;
}
