import { Card, CardContent, Typography } from "@mui/material";
import { useState } from "react";

interface Props {
  value: number | string;
  label: string;
  color: string;
  hoverContent?: React.ReactNode;
}

export default function StatCard({ value, label, color, hoverContent }: Props) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Card
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{
        background: color,
        border: "3px solid #000",
        borderRadius: "1.5rem",
        boxShadow: "4px 4px 0 rgba(0, 0, 0, 0.2)",
        flex: 1,
        minWidth: 0,
        transition: "all 0.3s ease-in-out",
        cursor: hoverContent ? "pointer" : "default",
        "&:hover": {
          transform: "scale(1.05)",
          boxShadow: "6px 6px 0 rgba(0, 0, 0, 0.3)",
        },
        px: 2,
      }}
    >
      <CardContent sx={{ textAlign: "center", p: { xs: 1.5, sm: 3 } }}>
        {!isHovered || !hoverContent ? (
          <>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 900,
                fontSize: { xs: "2rem", sm: "3rem" },
                color: "#000",
                mb: 1,
              }}
            >
              {value}
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
                fontWeight: 700,
                color: "#000",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {label}
            </Typography>
          </>
        ) : (
          hoverContent
        )}
      </CardContent>
    </Card>
  );
}
