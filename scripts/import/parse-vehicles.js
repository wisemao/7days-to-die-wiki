/**
 * Parse vehicles.xml to extract player-facing vehicle stats.
 * Maps vehicle definitions to their Placeable item IDs.
 */

export function parseVehiclesXml(xmlText) {
  const vehicles = [];
  const vehicleRegex = /<vehicle\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/vehicle>/g;
  let match;

  while ((match = vehicleRegex.exec(xmlText)) !== null) {
    const [, name, content] = match;
    const props = {};
    const propRegex = /<property\s+name="([^"]+)"\s+value="([^"]*)"/g;
    let pm;
    while ((pm = propRegex.exec(content)) !== null) {
      props[pm[1]] = pm[2];
    }

    const vehicle = {
      id: name,
      // The Placeable item shares the vehicle id + "Placeable" suffix
      item_id: name + 'Placeable',
    };
    // Max speed: velocityMax_turbo is "normal, reverse, turbo, downhill" - take max
    if (props.velocityMax_turbo) {
      const vals = props.velocityMax_turbo.split(',').map(s => parseFloat(s.trim()));
      vehicle.max_speed = Math.max(...vals.filter(v => !Number.isNaN(v)));
    }
    if (props.fuelPerUnitDistance) vehicle.fuel_per_unit = parseFloat(props.fuelPerUnitDistance);
    if (props.fuelPerKM) vehicle.fuel_per_unit = parseFloat(props.fuelPerKM);
    if (props.carryCapacity) vehicle.carry_capacity = parseInt(props.carryCapacity);
    if (props.storageSlots) vehicle.storage_slots = parseInt(props.storageSlots);

    vehicles.push(vehicle);
  }
  return vehicles;
}
