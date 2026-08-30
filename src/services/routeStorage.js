import { PREDEFINED_ROUTES } from '../config/routes';

export const SAVED_ROUTES_KEY = 'saved_dialectic_routes';
export const ACTIVE_ROUTE_ID_KEY = 'active_route_id';
export const LEGACY_ROUTES_KEY = 'forge_active_routes_state';
export const LEGACY_ACTIVE_ID_KEY = 'forge_selected_route_id';

/**
 * Obtiene todas las rutas guardadas desde localStorage con migración automática
 */
export const getSavedRoutes = () => {
  try {
    const raw = localStorage.getItem(SAVED_ROUTES_KEY);
    if (raw) {
      return JSON.parse(raw);
    }

    // Migración desde legacy key
    const legacyRaw = localStorage.getItem(LEGACY_ROUTES_KEY);
    if (legacyRaw) {
      const legacyState = JSON.parse(legacyRaw);
      const migrated = {};

      Object.entries(legacyState).forEach(([id, data]) => {
        const predefined = PREDEFINED_ROUTES.find((r) => r.id === id);
        const routeObj = data.customRoute || predefined;
        if (routeObj) {
          migrated[id] = {
            id,
            topic: routeObj.concept || routeObj.topic || 'Concepto Filosófico',
            title: routeObj.title,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
            currentStepIndex: data.currentStepIndex || 0,
            completedSteps: data.completedSteps || [],
            isCompleted: !!data.isCompleted,
            steps: routeObj.steps,
            messagesByStep: data.stepMessages || data.messagesByStep || {},
            isCustom: !!routeObj.isCustom,
          };
        }
      });

      localStorage.setItem(SAVED_ROUTES_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch (e) {
    console.error('Error leyendo rutas guardadas:', e);
  }
  return {};
};

/**
 * Retorna la lista de rutas guardadas como arreglo ordenado por fecha de actualización
 */
export const getSavedRoutesList = () => {
  const routesMap = getSavedRoutes();
  return Object.values(routesMap).sort((a, b) => {
    const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return dateB - dateA;
  });
};

/**
 * Guarda o actualiza una ruta en localStorage
 */
export const saveRouteProgress = (routeData) => {
  if (!routeData || !routeData.id) return;
  try {
    const all = getSavedRoutes();
    const existing = all[routeData.id] || {};

    const updated = {
      ...existing,
      ...routeData,
      updatedAt: new Date().toISOString(),
    };

    all[routeData.id] = updated;
    localStorage.setItem(SAVED_ROUTES_KEY, JSON.stringify(all));

    // Mantener sincronizada la clave legacy
    const legacyState = {};
    Object.entries(all).forEach(([id, r]) => {
      legacyState[id] = {
        currentStepIndex: r.currentStepIndex || 0,
        completedSteps: r.completedSteps || [],
        stepMessages: r.messagesByStep || {},
        isCompleted: !!r.isCompleted,
        ...(r.isCustom ? { customRoute: r } : {}),
      };
    });
    localStorage.setItem(LEGACY_ROUTES_KEY, JSON.stringify(legacyState));

    return updated;
  } catch (e) {
    console.error('Error guardando progreso de ruta:', e);
  }
};

/**
 * Elimina una ruta guardada de localStorage
 */
export const deleteSavedRoute = (routeId) => {
  if (!routeId) return;
  try {
    const all = getSavedRoutes();
    delete all[routeId];
    localStorage.setItem(SAVED_ROUTES_KEY, JSON.stringify(all));

    // Limpiar legacy
    const legacyRaw = localStorage.getItem(LEGACY_ROUTES_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw);
      delete legacy[routeId];
      localStorage.setItem(LEGACY_ROUTES_KEY, JSON.stringify(legacy));
    }

    // Si la ruta activa era esta, limpiarla
    if (getActiveRouteId() === routeId) {
      setActiveRouteId(null);
    }
  } catch (e) {
    console.error('Error eliminando ruta:', e);
  }
};

/**
 * Lee el ID de la ruta activa
 */
export const getActiveRouteId = () => {
  try {
    return localStorage.getItem(ACTIVE_ROUTE_ID_KEY) || localStorage.getItem(LEGACY_ACTIVE_ID_KEY) || null;
  } catch (e) {
    return null;
  }
};

/**
 * Guarda o limpia el ID de la ruta activa
 */
export const setActiveRouteId = (id) => {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_ROUTE_ID_KEY, id);
      localStorage.setItem(LEGACY_ACTIVE_ID_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_ROUTE_ID_KEY);
      localStorage.removeItem(LEGACY_ACTIVE_ID_KEY);
    }
  } catch (e) {}
};
