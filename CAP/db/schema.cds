namespace cycles;

entity Cycles {
  key ID       : UUID;
  creator      : String  @title: 'Creator';
  title        : String  @title: 'Title';
  cycleStatus  : String  @title: 'Cycle Status';
  uploadStatus : String  @title: 'Upload Status';
  // Soft-delete flag: 0 = visible, 1 = deleted. Rows are never physically removed.
  deleted      : Integer @title: 'Deleted' default 0;
}