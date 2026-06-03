import { Subject } from "rxjs"
import type { LoadType } from "../@types/LoaderType"
import type { ErrorType } from "../@types/ErrorType"

export const loader$ = new Subject<LoadType>()
export const error$ = new Subject<ErrorType>()