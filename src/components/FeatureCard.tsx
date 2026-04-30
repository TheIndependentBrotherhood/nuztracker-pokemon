"use client";

import { Card, CardContent, Stack, Typography, Box } from "@mui/material";

interface Props {
  icon: string;
  title: string;
  description: string;
}

export default function FeatureCard({ icon, title, description }: Props) {
  return (
    <Card
      sx={{
        background: "linear-gradient(135deg, #FEF3E2 0%, #FFE8B6 100%)",
        border: "3px solid #000",
        borderRadius: "1.5rem",
        boxShadow: "4px 4px 0 rgba(0, 0, 0, 0.2)",
        transition: "all 0.3s ease-in-out",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        "&:hover": {
          transform: "translate(-2px, -2px)",
          boxShadow: "6px 6px 0 rgba(0, 0, 0, 0.3)",
          background: "linear-gradient(135deg, #FFEDCC 0%, #FFE8B6 100%)",
        },
      }}
    >
      <CardContent sx={{ p: 3, height: "100%" }}>
        <Stack spacing={2.5}>
          {/* Icon */}
          <Box
            sx={{
              fontSize: "3rem",
              transition: "transform 0.3s ease-in-out",
            }}
          >
            {icon}
          </Box>

          {/* Title & Description */}
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                color: "#000",
                mb: 1,
                fontSize: "1.125rem",
              }}
            >
              {title}
            </Typography>
            <Typography
              sx={{
                fontSize: "0.95rem",
                color: "#4b5563",
                fontWeight: 500,
                lineHeight: 1.6,
              }}
            >
              {description}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
