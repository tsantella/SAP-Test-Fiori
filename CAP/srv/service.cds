using cycles as my from '../db/schema';

service CyclesService{
    @odata.draft.enabled
    entity Cycles as projection on my.Cycles;
}