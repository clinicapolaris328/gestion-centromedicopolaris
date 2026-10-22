import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Carga datos de la API con estados de carga/error y recarga manual.
 * `loader` es una función que devuelve una promesa (p. ej. () => turnosApi.list()).
 * Se usa un ref para no re-crear el efecto si el loader cambia de identidad;
 * la recarga se controla con `deps`.
 */
export function useApi(loader, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const loaderRef = useRef(loader)
  loaderRef.current = loader

  const reload = useCallback(() => {
    setLoading(true)
    setError(null)
    return loaderRef.current()
      .then((d) => { setData(d); return d })
      .catch((e) => { setError(e.message || 'Error al cargar los datos.') })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => { reload() }, [reload])

  return { data, setData, loading, error, reload }
}
