import { useState } from 'react'

export const useForm = (initial) => {
  const [values, setValues] = useState(initial)
  const bind = (key) => ({ value: values[key], onChange: (e) => setValues((v) => ({ ...v, [key]: e.target.value })) })
  const reset = (keep = {}) => setValues({ ...initial, ...keep })
  return { values, bind, reset }
}
