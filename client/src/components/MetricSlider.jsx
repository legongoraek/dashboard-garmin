// src/components/MetricSlider.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Button,
  Menu,
  MenuItem,
  Checkbox,
  ListItemText,
  Stack,
  Tooltip,
} from "@mui/material";

import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import TuneIcon from "@mui/icons-material/Tune";
import RestartAltIcon from "@mui/icons-material/RestartAlt";

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

function getItemKey(item, index) {
  return item.key || item.label || String(index);
}

function readStoredVisibleKeys(storageKey) {
  if (!storageKey) return null;

  try {
    const value = localStorage.getItem(storageKey);

    if (!value) return null;

    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) return null;

    return parsed;
  } catch {
    return null;
  }
}

function saveVisibleKeys(storageKey, keys) {
  if (!storageKey) return;

  localStorage.setItem(storageKey, JSON.stringify(keys));
}

export default function MetricSlider({
  items = [],
  cardWidth = 220,
  type = "default",
  filterable = false,
  storageKey = "",
}) {
  const scrollRef = useRef(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const [anchorEl, setAnchorEl] = useState(null);
  const [visibleKeys, setVisibleKeys] = useState(null);

  const currentStyle = sliderStyles[type] || sliderStyles.default;

  const allKeys = useMemo(() => {
    return items.map((item, index) => getItemKey(item, index));
  }, [items]);

  useEffect(() => {
    if (!filterable || !storageKey) {
      setVisibleKeys(null);
      return;
    }

    const storedKeys = readStoredVisibleKeys(storageKey);

    if (!storedKeys) {
      setVisibleKeys(allKeys);
      return;
    }

    /**
     * Esto evita que el storage quede viejo si luego agregas o renombras métricas.
     * Solo conserva keys que todavía existen.
     */
    const validStoredKeys = storedKeys.filter((key) => allKeys.includes(key));

    if (validStoredKeys.length === 0) {
      setVisibleKeys(allKeys);
      saveVisibleKeys(storageKey, allKeys);
      return;
    }

    setVisibleKeys(validStoredKeys);
  }, [filterable, storageKey, allKeys]);

  const filteredItems = useMemo(() => {
    if (!filterable) return items;
    if (!visibleKeys) return items;

    return items.filter((item, index) => {
      const key = getItemKey(item, index);
      return visibleKeys.includes(key);
    });
  }, [items, filterable, visibleKeys]);

  const hasCustomFilter =
    filterable &&
    visibleKeys &&
    allKeys.length > 0 &&
    visibleKeys.length !== allKeys.length;

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;

    const hasOverflow = el.scrollWidth > el.clientWidth + 1;

    setCanScrollLeft(hasOverflow && el.scrollLeft > 0);
    setCanScrollRight(
      hasOverflow && el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
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

  const toggleMetric = (key) => {
    if (!filterable || !storageKey) return;

    setVisibleKeys((prev) => {
      const current = prev || allKeys;

      /**
       * Evitamos que el usuario oculte todas las tarjetas.
       * Puede ocultar todas menos una.
       */
      if (current.includes(key) && current.length === 1) {
        return current;
      }

      const next = current.includes(key)
        ? current.filter((itemKey) => itemKey !== key)
        : [...current, key];

      saveVisibleKeys(storageKey, next);

      return next;
    });
  };

  const resetFilters = () => {
    setVisibleKeys(allKeys);
    saveVisibleKeys(storageKey, allKeys);
    setAnchorEl(null);
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
  }, [filteredItems, cardWidth]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      updateScrollState();
    }, 80);

    return () => clearTimeout(timeout);
  }, [filteredItems]);

  const showLeftArrow = canScrollLeft;
  const showRightArrow = canScrollRight;

  const menuOpen = Boolean(anchorEl);

  return (
    <Box>
      {filterable && (
        <Stack
          direction="row"
          spacing={1}
          sx={{
                width: "100%",
                mb: 1,
                px: 0.5,
                justifyContent: { xs: "flex-end", sm: "flex-end" },
                alignItems: { xs: "center", sm: "flex-end", },
            }}
        >
          {hasCustomFilter && (
            <Typography variant="caption" color="text.secondary" sx={{
                display: { xs: "none", sm: "block" },
                mr: "auto",
            }}>
              Mostrando {visibleKeys.length} de {allKeys.length}
            </Typography>
          )}

          <Button
            size="small"
            variant="outlined"
            startIcon={<TuneIcon />}
            onClick={(event) => setAnchorEl(event.currentTarget)}
            sx={{
                textTransform: "none",
                borderColor: currentStyle.border,
                color: currentStyle.accent,
                fontWeight: 700,
                minWidth: { xs: 36, sm: "auto" },
                width: { xs: 36, sm: "auto" },
                height: 36,
                px: { xs: 0, sm: 1.5 },

                "& .btn-label": {
                display: { xs: "none", sm: "inline" },
                },

                "& .MuiButton-startIcon": {
                m: { xs: 0, sm: "0 8px 0 -4px" },
                },
            }}
          >
            <span className="btn-label">Métricas</span>
          </Button>

          {hasCustomFilter && (
            <Tooltip title="Restablecer métricas">
              <IconButton
                size="small"
                onClick={resetFilters}
                sx={{
                  color: currentStyle.accent,
                  border: "1px solid",
                  borderColor: currentStyle.border,
                }}
              >
                <RestartAltIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          <Menu
            anchorEl={anchorEl}
            open={menuOpen}
            onClose={() => setAnchorEl(null)}
            slotProps={{
                paper: {
                sx: {
                    width: 260,
                    maxHeight: 360,
                },
                },
            }}
          >
            {items.map((item, index) => {
              const key = getItemKey(item, index);
              const checked = (visibleKeys || allKeys).includes(key);
              const disableUncheck =
                checked && (visibleKeys || allKeys).length === 1;

              return (
                <MenuItem
                  key={key}
                  onClick={() => toggleMetric(key)}
                  disabled={disableUncheck}
                >
                  <Checkbox checked={checked} />
                  <ListItemText
                    primary={item.label}
                    secondary={
                      disableUncheck ? "Debe quedar al menos una" : null
                    }
                  />
                </MenuItem>
              );
            })}

            <Box sx={{ px: 2, py: 1 }}>
              <Button
                fullWidth
                size="small"
                variant="contained"
                onClick={resetFilters}
                sx={{
                  textTransform: "none",
                  bgcolor: currentStyle.accent,
                  "&:hover": {
                    bgcolor: currentStyle.accent,
                  },
                }}
              >
                Mostrar todas
              </Button>
            </Box>
          </Menu>
        </Stack>
      )}

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
          {filteredItems.map((item, idx) => (
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
    </Box>
  );
}
