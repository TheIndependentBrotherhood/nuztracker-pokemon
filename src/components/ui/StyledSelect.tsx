import { Select, SelectProps, FormControl, InputLabel } from "@mui/material";

export default function StyledSelect(props: SelectProps) {
  const { label, ...selectProps } = props;

  return (
    <FormControl fullWidth={props.fullWidth} sx={props.sx}>
      {label && (
        <InputLabel
          sx={{
            color: "#000",
            fontWeight: 600,
            paddingLeft: "2px",
            marginY: "2px",
            "&.Mui-focused": {
              color: "#000",
              transform: "translate(14px, -17px) scale(0.75)",
            },
            "&.MuiInputLabel-shrink": {
              transform: "translate(14px, -17px) scale(0.75)",
            },
          }}
        >
          {label}
        </InputLabel>
      )}
      <Select
        {...selectProps}
        label={label}
        sx={{
          borderRadius: "1.5rem",
          backgroundColor: "#fff",
          border: "2px solid #000",
          color: "#000",
          fontWeight: 600,
          "& .MuiOutlinedInput-notchedOutline": { border: "none" },
          "& svg": { color: "#000" },
        }}
      />
    </FormControl>
  );
}
