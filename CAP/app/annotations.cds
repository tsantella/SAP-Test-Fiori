// Import the CyclesService definition from the service file, so we can add
// annotations to it (annotations must reference something already defined elsewhere)
using CyclesService from '../srv/service';

// "annotate" adds extra metadata (UI hints) to an existing entity, without
// changing the entity's actual structure/fields.
// Here we target CyclesService.Cycles — the entity, not the whole service.
annotate CyclesService.Cycles with @(

  // UI.LineItem defines which columns appear in the LIST/TABLE view
  // (the main "Cycles" list report page you saw earlier)
  UI.LineItem: [
    { Value: creator },       // Column 1: shows the "creator" field
    { Value: title },         // Column 2: shows the "title" field
    { Value: cycleStatus },   // Column 3: shows the "cycleStatus" field
    { Value: uploadStatus }   // Column 4: shows the "uploadStatus" field
  ],

  // UI.HeaderInfo controls the page header shown on the Object Page
  // (the detail page you land on after clicking a row, or when creating a new one)
  UI.HeaderInfo: {
    TypeName: 'Cycle',            // Singular label, e.g. shown in "Create Cycle" button/title
    TypeNamePlural: 'Cycles',     // Plural label, e.g. shown in the list page title
    // Title: {
    //   Value: title                // Which field is used as the main heading text on the Object Page
    // }
  },

  // UI.Facets defines the SECTIONS (like tabs or panels) shown on the Object Page.
  // Without this, Fiori doesn't know to render any form at all beyond the title.
  UI.Facets: [
    {
      $Type: 'UI.ReferenceFacet',        // Standard type for a facet that points to a field group
      Label: 'Cycle Details',            // The section header text shown on the Object Page
      Target: '@UI.FieldGroup#Details'   // Points to the field group defined below (by its #Details tag)
    }
  ],

  // UI.FieldGroup#Details defines WHICH fields appear inside the "Cycle Details" section
  // "#Details" is just a name/label for this specific group — you could add more groups
  // (e.g. #Details, #Status) and reference each in a separate Facet above
  UI.FieldGroup#Details: {
    Data: [
      { Value: creator },       // Editable field 1: creator
      { Value: title },         // Editable field 2: title
      { Value: cycleStatus },   // Editable field 3: cycleStatus
      { Value: uploadStatus }   // Editable field 4: uploadStatus
    ]
  }
);