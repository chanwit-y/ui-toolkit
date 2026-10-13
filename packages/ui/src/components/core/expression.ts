import { get } from "lodash";
import type { CondValue, Primitive, Ref, CondExpression, Val } from "../@types";
import { readSlice } from "./stateStore";

/**
 * Global-state keys the conditions read through `source: "state"` refs, so a
 * renderer can subscribe and re-evaluate when a slice lands.
 */
export function conditionStateKeys(conditions: (CondExpression | undefined)[]): string[] {
  const keys = new Set<string>();
  const walk = (t: unknown) => {
    if (!t || typeof t !== "object") return;
    const o = t as Record<string, unknown>;
    if ("operator" in o) {
      walk(o.left);
      walk(o.right);
    } else if (o.source === "state" && typeof o.key === "string") keys.add(o.key);
  };
  conditions.forEach(walk);
  return [...keys];
}


export class ConditionExpression {
  constructor(private _contextData: Record<string, any>) {}

  private _isExpression(term: CondValue | CondExpression): term is CondExpression {
    return (
      typeof term === "object" &&
      term !== null &&
      "left" in term &&
      "right" in term &&
      "operator" in term
    );
  }

  private _isKey(term: CondValue) {
    return typeof term === "object" && term !== null && "key" in term;
  }

  private _evaluate(expression: CondExpression): boolean {
    switch (expression.operator) {
      case "eq":
        return this._term(expression.left) === this._term(expression.right);
      case "neq":
        return this._term(expression.left) !== this._term(expression.right);
      case "gt":
        return this._term(expression.left) > this._term(expression.right);
      case "gte":
        return this._term(expression.left) >= this._term(expression.right);
      case "lt":
        return this._term(expression.left) < this._term(expression.right);
      case "lte":
        return this._term(expression.left) <= this._term(expression.right);

      case "and":
        return (
          Boolean(this._term(expression.left)) &&
          Boolean(this._term(expression.right))
        );
      case "or":
        return (
          Boolean(this._term(expression.left)) ||
          Boolean(this._term(expression.right))
        );
      default:
        return false;
    }
  }

  private _term(term: CondValue | CondExpression): Primitive {
    return this._isExpression(term)
      ? this._evaluate(term)
      : this._isKey(term)
        ? this._ref(term as Ref)
        : (term as Val).val;
  }

  private _ref(ref: Ref): Primitive {
    if (ref.source === "state") return readSlice(ref.key!, ref.path) as Primitive;
    return get(this?._contextData?.[ref.key!], ref.path ?? "");
  }

  public expression(expression: CondExpression) {
    return this._evaluate(expression);
  }
}