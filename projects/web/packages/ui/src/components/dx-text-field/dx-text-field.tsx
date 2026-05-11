import { Field } from "@base-ui/react/field";
import { compact } from "lodash-es";
import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import * as s from "./dx-text-field.css";

export type DxTextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
};

export function DxTextField({
  id,
  label,
  description,
  error,
  disabled,
  "aria-describedby": ariaDescribedBy,
  ...inputProps
}: DxTextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? `dx-text-field-${generatedId}`;
  const descriptionId = optionalElementId({
    baseId: inputId,
    suffix: "description",
    value: description,
  });
  const errorId = optionalElementId({
    baseId: inputId,
    suffix: "error",
    value: error,
  });
  const describedBy = describedByValue({
    existingValue: ariaDescribedBy,
    descriptionId,
    errorId,
  });

  return (
    <Field.Root className={s.textField} disabled={disabled} invalid={Boolean(error)}>
      <Field.Label className={s.label} htmlFor={inputId}>
        {label}
      </Field.Label>

      <Field.Control
        {...inputProps}
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
        className={s.control}
        disabled={disabled}
        id={inputId}
      />

      {description && (
        <Field.Description className={s.description} id={descriptionId}>
          {description}
        </Field.Description>
      )}

      {error && (
        <div className={s.error} id={errorId} role="alert">
          {error}
        </div>
      )}
    </Field.Root>
  );
}

function optionalElementId({
  baseId,
  suffix,
  value,
}: {
  baseId: string;
  suffix: string;
  value: ReactNode;
}): string | undefined {
  if (!value) {
    return undefined;
  }

  return `${baseId}-${suffix}`;
}

function describedByValue({
  existingValue,
  descriptionId,
  errorId,
}: {
  existingValue: string | undefined;
  descriptionId: string | undefined;
  errorId: string | undefined;
}): string | undefined {
  const values = compact([existingValue, descriptionId, errorId]);

  if (values.length === 0) {
    return undefined;
  }

  return values.join(" ");
}
