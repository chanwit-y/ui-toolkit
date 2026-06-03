import { get } from "lodash";
import type { CondValue, Primitive, Ref, CondExpression, Val } from "../@types";


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
        ? get(this?._contextData?.[(term as Ref).key!], (term as Ref).path ?? "")
        : (term as Val).val;
  }

  public expression(expression: CondExpression) {
    return this._evaluate(expression);
  }
}