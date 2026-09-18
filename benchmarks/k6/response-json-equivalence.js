import http from 'k6/http';
import { check } from 'k6';
import { hasOpenApiPaths } from './api-benchmark.js';

export const options = { vus: 1, iterations: 1, thresholds: { checks: ['rate==1'] } };

const fixtures = [
  ['valid paths', '{"paths":{"/health":{"get":{}}}}', true],
  ['empty paths', '{"paths":{}}', false],
  ['missing paths', '{"openapi":"3.0.3"}', false],
  ['null paths', '{"paths":null}', false],
  ['false paths', '{"paths":false}', false],
  ['true paths', '{"paths":true}', false],
  ['number paths', '{"paths":42}', false],
  ['empty string paths', '{"paths":""}', false],
  ['string paths', '{"paths":"route"}', true],
  ['empty array paths', '{"paths":[]}', false],
  ['array paths', '{"paths":["route"]}', true],
  ['root null', 'null', false],
  ['root array', '[]', false],
  ['empty body', '', false],
  ['malformed body', '{"paths":', false],
  ['malformed suffix', '{"paths":{"/health":{}},"broken":}', false],
  ['trailing garbage', '{"paths":{"/health":{}}} invalid', false],
  ['second JSON value', '{"paths":{"/health":{}}} {}', false],
  ['duplicate paths', '{"paths":{"/health":{}},"paths":{}}', false],
  ['numeric overflow elsewhere', '{"paths":{"/health":{}},"example":1e400}', false]
];

function legacyHasPaths(response) {
  try {
    const body = JSON.parse(response.body);
    return body.paths && Object.keys(body.paths).length > 0;
  } catch {
    return false;
  }
}

function verify(name, response, expected) {
  const legacy = Boolean(legacyHasPaths(response));
  const candidate = Boolean(hasOpenApiPaths(response));
  check(response, {
    [`${name}: fixture served`]: (r) => r.status === 200,
    [`${name}: original predicate`]: () => legacy === expected,
    [`${name}: native predicate equivalent`]: () => candidate === legacy
  });
}

export default function () {
  const target = __ENV.FIXTURE_TARGET;
  for (const [name, body, expected] of fixtures) {
    verify(name, http.post(`${target}/echo`, body), expected);
  }
  verify('complete repository specification', http.get(`${target}/openapi.json`), true);
}
