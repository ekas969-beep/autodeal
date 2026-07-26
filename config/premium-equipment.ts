export const carPremiumEquipmentOptions = [
  "Leather seats",
  "Heated seats",
  "Ventilated seats",
  "Electric seats",
  "Memory seats",
  "Panoramic roof",
  "Sunroof",
  "Navigation",
  "Apple CarPlay",
  "Android Auto",
  "Bluetooth",
  "Reversing camera",
  "360 camera",
  "Parking sensors",
  "Adaptive cruise control",
  "Lane assist",
  "Blind spot monitor",
  "Keyless entry",
  "Keyless start",
  "LED headlights",
  "Xenon headlights",
  "Alloy wheels",
  "Tow bar",
  "Service history",
]

export const motorcyclePremiumEquipmentOptions = [
  "ABS",
  "Traction control",
  "Riding modes",
  "Quick shifter",
  "Cruise control",
  "Heated grips",
  "LED headlights",
  "Adjustable suspension",
  "Centre stand",
  "Top box",
  "Side panniers",
  "Tank bag",
  "Crash bars",
  "Frame sliders",
  "Wind screen",
  "Hand guards",
  "Phone mount",
  "USB charger",
  "Alarm",
  "Immobiliser",
  "Service history",
  "New tyres",
  "Chain and sprockets done",
  "Aftermarket exhaust",
]

export const allPremiumEquipmentOptions = Array.from(
  new Set([...carPremiumEquipmentOptions, ...motorcyclePremiumEquipmentOptions])
)

export function getPremiumEquipmentOptions(category: string) {
  return category === "motorcycles"
    ? motorcyclePremiumEquipmentOptions
    : carPremiumEquipmentOptions
}
