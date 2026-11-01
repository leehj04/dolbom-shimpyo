export function calcAge(birthDate: string | null): number | null {
  if (!birthDate) return null
  const b = new Date(birthDate)
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const hasHadBirthdayThisYear =
    now.getMonth() > b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() >= b.getDate())
  if (!hasHadBirthdayThisYear) age -= 1
  return age
}
