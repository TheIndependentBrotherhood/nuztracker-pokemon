import { Select, SelectProps } from "@mui/material";

export default function StyledSelect(props: SelectProps) {
  return (
    <Select
      {...props}
      sx={{
        borderRadius: "1.5rem",
        backgroundColor: "#fff",
        border: "2px solid #000",
        color: "#000",
        fontWeight: 600,
        "& .MuiOutlinedInput-notchedOutline": { border: "none" },
        "& svg": { color: "#000" },
        "& .MuiInputLabel-root": {
          color: "#666",
          fontWeight: 600,
          "&.Mui-focused": {
            color: "#000",
          },
        },
        ...props.sx,
      }}
    />
  );
}
