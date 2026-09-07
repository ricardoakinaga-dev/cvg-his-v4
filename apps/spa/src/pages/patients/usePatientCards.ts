import { ref } from 'vue';

export function usePatientCards() {
  const expandedPatientCards = ref<Set<string>>(new Set());
  const patientCardNavigationOrder = [
    'animal-more',
    'owner-contact',
    'encounters',
    'anamnesis',
    'preventive',
    'agenda',
    'billing',
    'exams',
    'inpatient',
    'prescriptions',
    'weight',
    'images',
    'clinical-history'
  ] as const;

  function isPatientCardExpanded(cardId: string) {
    return expandedPatientCards.value.has(cardId);
  }

  function togglePatientCard(cardId: string) {
    const next = new Set(expandedPatientCards.value);
    if (next.has(cardId)) {
      next.delete(cardId);
    } else {
      next.add(cardId);
    }
    expandedPatientCards.value = next;
  }

  function patientCardTriggerId(cardId: string) {
    return `patient-card-${cardId}-trigger`;
  }

  function patientCardPanelId(cardId: string) {
    return `patient-card-${cardId}-panel`;
  }

  function focusPatientCardTrigger(cardId: string) {
    if (typeof document === 'undefined') {
      return;
    }

    document.getElementById(patientCardTriggerId(cardId))?.focus();
  }

  function handlePatientCardTriggerKeydown(event: KeyboardEvent, cardId: string) {
    const currentIndex = patientCardNavigationOrder.indexOf(
      cardId as (typeof patientCardNavigationOrder)[number]
    );
    if (currentIndex === -1) {
      return;
    }

    let nextIndex = currentIndex;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % patientCardNavigationOrder.length;
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      nextIndex =
        (currentIndex - 1 + patientCardNavigationOrder.length) % patientCardNavigationOrder.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = patientCardNavigationOrder.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    focusPatientCardTrigger(patientCardNavigationOrder[nextIndex]);
  }

  return {
    expandedPatientCards,
    isPatientCardExpanded,
    togglePatientCard,
    patientCardTriggerId,
    patientCardPanelId,
    handlePatientCardTriggerKeydown,
  };
}
