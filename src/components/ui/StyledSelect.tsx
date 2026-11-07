"use client";

import { useId } from "react";
import { Select, SelectProps, FormControl, InputLabel } from "@mui/material";

export default function StyledSelect(props: SelectProps) {
  const generatedId = useId();
  const {
    label,
    labelId = `${generatedId}-label`,
    id = `${generatedId}-select`,
    fullWidth,
    size,
    error,
    disabled,
    required,
    variant = "outlined",
    sx,
    ...selectProps
  } = props;

  return (
    <FormControl
      fullWidth={fullWidth}
      size={size}
      error={error}
      disabled={disabled}
      required={required}
      variant={variant}
      sx={sx}
    >
      {label && <InputLabel id={labelId}>{label}</InputLabel>}
      <Select
        {...selectProps}
        id={id}
        labelId={label ? labelId : undefined}
        label={label}
        variant={variant}
      />
    </FormControl>
  );
}
