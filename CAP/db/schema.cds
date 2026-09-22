namespace cycles;

entity Cycles {
  key ID       : UUID;
  creator      : String  @title: 'Creator';
  title        : String  @title: 'Title';
  cycleStatus  : String  @title: 'Cycle Status';
  uploadStatus : String  @title: 'Upload Status';
  // Soft-delete flag: 0 = visible, 1 = deleted. Rows are never physically removed.
  deleted      : Integer @title: 'Deleted' default 0;
  // Not used by the UI yet - reserved for a later chunk that links Models to a specific Cycle.
  models       : Association to many CycleModels on models.cycle = $self;
}

entity Models {
  key ID              : UUID;
  modelStatus         : String @title: 'Model Status';
  status              : String @title: 'Status';
  oeGroupNr           : String @title: 'OE Group Nr';
  oeGroup             : String @title: 'OE Group';
  brandNr             : String @title: 'Brand Nr';
  brand               : String @title: 'Brand';
  subGroup            : String @title: 'Sub Group';
  region              : String @title: 'Region';
  country             : String @title: 'Country';
  modelVersion        : String @title: 'Model Version';
  model               : String @title: 'Model';
  propulsionType      : String @title: 'Propulsion Type';
  developmentCode     : String @title: 'Development Code';
  platformNr          : String @title: 'Platform Nr';
  platform            : String @title: 'Platform';
  // Soft-delete flag: 0 = visible, 1 = deleted. Rows are never physically removed.
  deleted             : Integer @title: 'Deleted' default 0;
  vehicleSegment      : String @title: 'Vehicle Segment';
  sop                 : Date   @title: 'SOP';
  eop                 : Date   @title: 'EOP';
  budgets             : Composition of many ModelBudgets on budgets.model = $self;
}

entity ModelBudgets {
  key ID       : UUID;
  model        : Association to Models;
  year         : String @title: 'Year';
  budget       : String @title: 'Budget';
  lastFC       : String @title: 'Last FC';
  newFC        : String @title: 'New FC';
  lastIV       : String @title: 'Last IV';
  newIV        : String @title: 'New IV';
  budgetView   : String @title: 'Budget View';
}

// Junction table - makes Cycles <-> Models many-to-many.
// Not wired into the UI yet; a later chunk will populate and use this.
entity CycleModels {
  key cycle : Association to Cycles;
  key model : Association to Models;
}

// Legacy - deployed to production outside this repo (see esebial). Declared here only
// so `cds deploy` doesn't try to drop it. Likely to be retired/merged into Models
// once confirmed - do not build new features against this.
entity Status {
  key ID          : UUID;
  modelVersion    : String;
  deleted         : Integer default 0;
  oeGroup         : String;
  brand           : String;
  subGroup        : String;
  region          : String;
  country         : String;
  modelStatus     : String;
  model           : String;
  propulsType     : String;
  devCode         : String;
  platform        : String;
  vehicleSegment  : String;
  sop             : String;
  eop             : String;
  budget2026      : String;
  lastFc2026      : String;
  newFc2026       : String;
}