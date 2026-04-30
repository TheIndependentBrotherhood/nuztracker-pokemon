import { TextField, TextFieldProps } from "@mui/material";

export default function StyledTextField(props: TextFieldProps) {
  return (
    <TextField
      {...props}
      sx={{
        "& .MuiOutlinedInput-root": {
          borderRadius: "1.5rem",
          backgroundColor: "#fff",
          border: "2px solid #000",
          "& fieldset": { border: "none" },
          "&:hover": { backgroundColor: "#fff" },
          "&.Mui-focused": {
            backgroundColor: "#fff",
            "& fieldset": { border: "none" },
          },
        },
        "& .MuiOutlinedInput-input": {
          color: "#000",
          fontWeight: 500,
          padding: "16.5px 14px",
        },
        "& .MuiInputBase-input::placeholder": {
          color: "#aaa",
          opacity: 1,
          paddingLeft: "2px",
          marginY: "2px",
        },
        "& .MuiInputLabel-root": {
          color: "#666",
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
        },
        ...props.sx,
      }}
    />
  );
}
