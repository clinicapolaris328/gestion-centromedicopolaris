import { useState, useEffect } from 'react'

/**
 * Estado persistido en localStorage — para preferencias trazables
 * del proyecto (tema, colapso del sidebar, etc.).
 */
export function usePref(key, inicial) {
  const [valor, setValor] = useState(() => {
    const guardado = localStorage.getItem(key)
    return guardado === null ? inicial : JSON.parse(guardado)
  })

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(valor))
  }, [key, valor])

  return [valor, setValor]
}
