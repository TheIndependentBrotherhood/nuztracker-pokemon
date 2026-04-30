import { Button, ButtonProps } from "@mui/material";

type Variant = "primary" | "danger" | "secondary";
type Shape = "rounded" | "pill";

interface Props extends Omit<ButtonProps, "variant"> {
  variant?: Variant;
  shape?: Shape;
}

const variantStyles: Record<Variant, any> = {
  primary: {
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    color: "#fff",
  },
  danger: {
    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    color: "#fff",
  },
  secondary: {
    background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
    color: "#fff",
  },
};

const shapeStyles: Record<Shape, any> = {
  rounded: {
    borderRadius: "2rem",
  },
  pill: {
    borderRadius: "9999px",
  },
};

export default function StyledButton({
  variant = "primary",
  shape = "rounded",
  sx,
  ...props
}: Props) {
  return (
    <Button
      {...props}
      sx={{
        ...variantStyles[variant],
        ...shapeStyles[shape],
        border: "3px solid #000",
        fontWeight: 700,
        fontSize: "1rem",
        px: 4,
        py: 1.5,
        boxShadow: "4px 4px 0 rgba(0, 0, 0, 0.3)",
        transition: "all 0.2s ease-in-out",
        textTransform: "none",
        "&:hover": {
          transform: "translate(-2px, -2px)",
          boxShadow: "6px 6px 0 rgba(0, 0, 0, 0.4)",
        },
        "&:active": {
          transform: "translate(1px, 1px)",
          boxShadow: "2px 2px 0 rgba(0, 0, 0, 0.2)",
        },
        "&:disabled": {
          opacity: 0.5,
          cursor: "not-allowed",
        },
        ...sx,
      }}
    />
  );
}
