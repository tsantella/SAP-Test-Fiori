using cycles as my from '../db/schema';

service CyclesService{
    @odata.draft.enabled
    entity Cycles as projection on my.Cycles;

    entity Models as projection on my.Models;
    entity ModelBudgets as projection on my.ModelBudgets;

    @odata.draft.enabled
    entity Status as projection on my.Status;
}