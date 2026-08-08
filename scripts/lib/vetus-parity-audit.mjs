export const PROOF_LAYERS = Object.freeze(['ui', 'api', 'persistence', 'tests', 'e2e']);

function hasLayerEvidence(proofs, verifyProof) {
  return proofs.length > 0 && proofs.every((proof) => verifyProof(proof));
}

export function evaluateArea(area, verifyProof) {
  const layerResults = Object.fromEntries(
    PROOF_LAYERS.map((layer) => [
      layer,
      hasLayerEvidence(area.evidence[layer] ?? [], verifyProof)
    ])
  );
  const missingLayers = PROOF_LAYERS.filter((layer) => !layerResults[layer]);
  const passedLayers = PROOF_LAYERS.length - missingLayers.length;
  const blockers = [...(area.blockers ?? [])];

  return Object.freeze({
    ...area,
    layerResults: Object.freeze(layerResults),
    missingLayers: Object.freeze(missingLayers),
    blockers: Object.freeze(blockers),
    score: Math.round((passedLayers / PROOF_LAYERS.length) * 100),
    status: blockers.length > 0 ? 'blocked' : missingLayers.length > 0 ? 'partial' : 'verified'
  });
}

export function evaluateAudit(areas, verifyProof) {
  const evaluatedAreas = areas.map((area) => evaluateArea(area, verifyProof));
  const verifiedAreas = evaluatedAreas.filter((area) => area.status === 'verified').length;
  const evidenceScore = Math.round(
    evaluatedAreas.reduce((sum, area) => sum + area.score, 0) / Math.max(evaluatedAreas.length, 1)
  );

  return Object.freeze({
    areas: Object.freeze(evaluatedAreas),
    totalAreas: evaluatedAreas.length,
    verifiedAreas,
    evidenceScore,
    passed: evaluatedAreas.length > 0 && verifiedAreas === evaluatedAreas.length
  });
}
