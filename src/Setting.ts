import { Question } from './Question';
export interface Setting{
    questions: { [index: string]: Question; };
    code: number;
}