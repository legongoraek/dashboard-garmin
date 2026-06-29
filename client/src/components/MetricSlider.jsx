// src/components/MetricSlider.jsx
import { useEffect, useRef, useState } from "react";
import { Box, Card, CardContent, Typography, IconButton } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

const sliderStyles = {
  daily: {
    accent: "#1976d2",
    bg: "linear-gradient(135deg, rgba(25,118,210,0.10), rgba(25,118,210,0.02))",
    border: "rgba(25,118,210,0.22)",
  },
  sleep: {
    accent: "#6a1b9a",
    bg: "linear-gradient(135deg, rgba(106,27,154,0.10), rgba(106,27,154,0.02))",
    border: "rgba(106,27,154,0.22)",
  },
  "hrv-readiness": {
    accent: "#00897b",
    bg: "linear-gradient(135deg, rgba(0,137,123,0.10), rgba(0,137,123,0.02))",
    border: "rgba(0,137,123,0.22)",
  },
  default: {
    accent: "#546e7a",
    bg: "linear-gradient(135deg, rgba(84,110,122,0.10), rgba(84,110,122,0.02))",
    border: "rgba(84,110,122,0.22)",
  },
};

export default function MetricSlider({
  items = [],
  cardWidth = 220,
  type = "default",
}) {
  const scrollRef = useRef(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const currentStyle = sliderStyles[type] || sliderStyles.default;

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;

    const hasOverflow = el.scrollWidth > el.clientWidth + 1;

    setCanScrollLeft(hasOverflow && el.scrollLeft > 0);
    setCanScrollRight(
      hasOverflow && el.scrollLeft + el.clientWidth < el.scrollWidth - 1
    );
  };

  const scrollBy = (dir) => {
    const el = scrollRef.current;
    if (!el) return;

    el.scrollBy({
      left: dir * (cardWidth + 16),
      behavior: "smooth",
    });
  };

  useEffect(() => {
    updateScrollState();

    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener("scroll", updateScrollState);

    const resizeObserver = new ResizeObserver(() => {
      updateScrollState();
    });

    resizeObserver.observe(el);

    return () => {
      el.removeEventListener("scroll", updateScrollState);
      resizeObserver.disconnect();
    };
  }, [items, cardWidth]);

  const showLeftArrow = canScrollLeft;
  const showRightArrow = canScrollRight;

  return (
    <Box
      sx={{
        position: "relative",
        px: {
          xs: 0,
          sm: showLeftArrow || showRightArrow ? 4 : 0,
        },
      }}
    >
      {showLeftArrow && (
        <IconButton
          onClick={() => scrollBy(-1)}
          sx={{
            display: { xs: "none", sm: "flex" },
            position: "absolute",
            left: 0,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 2,
            bgcolor: "background.paper",
            color: currentStyle.accent,
            boxShadow: 2,
            border: "1px solid",
            borderColor: currentStyle.border,
            "&:hover": {
              bgcolor: "background.paper",
              transform: "translateY(-50%) scale(1.04)",
            },
          }}
          size="small"
        >
          <ChevronLeftIcon />
        </IconButton>
      )}

      <Box
        ref={scrollRef}
        sx={{
          display: "flex",
          gap: 2,
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          scrollBehavior: "smooth",
          pb: 1,
          px: 0.5,

          "&::-webkit-scrollbar": {
            height: 6,
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "rgba(0,0,0,0.15)",
            borderRadius: 4,
          },
          "&::-webkit-scrollbar-track": {
            backgroundColor: "transparent",
          },
        }}
      >
        {items.map((item, idx) => (
          <Card
            key={`${item.label}-${idx}`}
            elevation={0}
            sx={{
              flex: `0 0 ${cardWidth}px`,
              minWidth: cardWidth,
              scrollSnapAlign: "start",
              border: "1px solid",
              borderColor: currentStyle.border,
              background: currentStyle.bg,
              position: "relative",
              overflow: "hidden",

              "&::before": {
                content: '""',
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: 4,
                bgcolor: currentStyle.accent,
              },
            }}
          >
            <CardContent sx={{ pt: 2.5 }}>
              <Typography color="text.secondary" noWrap>
                {item.label}
              </Typography>

              <Typography
                variant="h4"
                fontWeight={800}
                sx={{
                  color: "text.primary",
                  lineHeight: 1.15,
                  mt: 0.5,
                }}
              >
                {item.loading ? "..." : item.value}
              </Typography>

              {item.sublabel && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  noWrap
                  sx={{ mt: 0.5 }}
                >
                  {item.sublabel}
                </Typography>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>

      {showRightArrow && (
        <IconButton
          onClick={() => scrollBy(1)}
          sx={{
            display: { xs: "none", sm: "flex" },
            position: "absolute",
            right: 0,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 2,
            bgcolor: "background.paper",
            color: currentStyle.accent,
            boxShadow: 2,
            border: "1px solid",
            borderColor: currentStyle.border,
            "&:hover": {
              bgcolor: "background.paper",
              transform: "translateY(-50%) scale(1.04)",
            },
          }}
          size="small"
        >
          <ChevronRightIcon />
        </IconButton>
      )}
    </Box>
  );
}