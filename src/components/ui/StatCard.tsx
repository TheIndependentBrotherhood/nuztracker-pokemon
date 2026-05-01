import { Card, CardContent, Typography, IconButton, Box } from "@mui/material";
import { useState } from "react";

interface Action {
  icon: string;
  title: string;
  onClick: () => void;
  disabled?: boolean;
}

interface Props {
  value: number | string;
  label: string;
  color: string;
  hoverContent?: React.ReactNode;
  actions?: Action[];
}

export default function StatCard({
  value,
  label,
  color,
  hoverContent,
  actions,
}: Props) {
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
        minWidth: "208px",
        transition: "all 0.3s ease-in-out",
        cursor: hoverContent ? "pointer" : "default",
        "&:hover": {
          transform: "scale(1.05)",
          boxShadow: "6px 6px 0 rgba(0, 0, 0, 0.3)",
        },
        px: 2,
        position: "relative",
      }}
    >
      {/* Action buttons - top right corner */}
      {actions && actions.length > 0 && (
        <Box
          sx={{
            position: "absolute",
            top: 6,
            right: 6,
            display: "flex",
            gap: 0.25,
          }}
        >
          {actions.map((action, index) => (
            <IconButton
              key={index}
              onClick={action.onClick}
              disabled={action.disabled}
              title={action.title}
              sx={{
                color: "#000",
                background: "rgba(255, 255, 255, 0.8)",
                border: "2px solid #000",
                borderRadius: "0.5rem",
                padding: "0.375rem",
                fontSize: "1rem",
                transition: "all 200ms ease",
                width: "38px",
                height: "38px",
                "&:hover": {
                  background: "rgba(255, 255, 255, 1)",
                  transform: "translateY(-2px)",
                },
                "&:disabled": {
                  opacity: 0.5,
                },
              }}
            >
              {action.icon}
            </IconButton>
          ))}
        </Box>
      )}

      <CardContent
        sx={{
          textAlign: "center",
          p: { xs: 1.5, sm: 3 },
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
          minHeight: "208px",
        }}
      >
        {!isHovered || !hoverContent ? (
          <>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 900,
                fontSize: { xs: "2rem", sm: "3rem" },
                color: "#000",
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
