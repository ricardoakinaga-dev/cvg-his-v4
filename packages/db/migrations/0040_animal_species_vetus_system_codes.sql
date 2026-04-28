-- Keep animal_species database constraint aligned with the Vetus parity species catalog.

ALTER TABLE animal_species
  DROP CONSTRAINT IF EXISTS animal_species_system_code_chk;

ALTER TABLE animal_species
  ADD CONSTRAINT animal_species_system_code_chk CHECK (
    system_code IN (
      'not_defined',
      'avian',
      'bovine',
      'canine',
      'rabbit',
      'equine',
      'feline',
      'other',
      'primate',
      'rodent',
      'reptile'
    )
  );
