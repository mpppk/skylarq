import { Question } from './Question';
export class Setting{
    questions: { [index: string]: Question; }
    code: number
}