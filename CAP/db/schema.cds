namespace cycles;

entity Cycles {
  key ID       : UUID;
  creator      : String  @title: 'Creator';
  title        : String  @title: 'Title';
  cycleStatus  : String  @title: 'Cycle Status';
  uploadStatus : String  @title: 'Upload Status';
}