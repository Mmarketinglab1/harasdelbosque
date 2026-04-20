
import { Room } from './types';

// Unidades iniciales con precio base y nuevos campos de precio
export const ROOMS: Room[] = [
  { id: '1', category: 'Marina', number: '11', description: '1 mat; 1 sofa cama c carrito', capacity: '4pax', colorClass: 'bg-orange-100', basePrice: 15000, januaryPrice: 100000, februaryPrice: 90000, promoPrice: 12000, weekendPrice: 18000, selectedPriceType: 'standard' },
  { id: '2', category: 'Marina', number: '12', description: '1 mat 1 single sofa cama + carrito', capacity: '5 pax', colorClass: 'bg-orange-100', basePrice: 15000, januaryPrice: 100000, februaryPrice: 90000, promoPrice: 12000, weekendPrice: 18000, selectedPriceType: 'standard' },
  { id: '3', category: 'Marina', number: '13', description: '1 mat 1 single sofa cama + carrito', capacity: '5 pax', colorClass: 'bg-orange-100', basePrice: 15000, januaryPrice: 100000, februaryPrice: 90000, promoPrice: 12000, weekendPrice: 18000, selectedPriceType: 'standard' },
  { id: '4', category: 'Marina', number: '14', description: '1 mat; 1 sofa cama c carrito', capacity: '4pax', colorClass: 'bg-orange-100', basePrice: 15000, januaryPrice: 100000, februaryPrice: 90000, promoPrice: 12000, weekendPrice: 18000, selectedPriceType: 'standard' },
  { id: '5', category: 'Triplex', number: '21', description: '1 mat; 3 single Baño y toilete', capacity: 'TX5pax', colorClass: 'bg-purple-600 text-white', basePrice: 15000, januaryPrice: 120000, februaryPrice: 110000, promoPrice: 13000, weekendPrice: 20000, selectedPriceType: 'standard' },
  { id: '6', category: 'Duplex', number: '22', description: '1 Mat; 2 singles 1 baño y toilete', capacity: '4pax', colorClass: 'bg-orange-100', basePrice: 15000, januaryPrice: 100000, februaryPrice: 90000, promoPrice: 12000, weekendPrice: 18000, selectedPriceType: 'standard' },
  { id: '7', category: 'Duplex', number: '23', description: '1 Mat; 2 singles; 1 sofa cama 2', capacity: '6pax', colorClass: 'bg-orange-100', basePrice: 15000, januaryPrice: 110000, februaryPrice: 100000, promoPrice: 12500, weekendPrice: 19000, selectedPriceType: 'standard' },
  { id: '8', category: 'Duplex', number: '24', description: '1 Mat; 2 singles; 1 sofa cama 2', capacity: '6pax', colorClass: 'bg-orange-100', basePrice: 15000, januaryPrice: 110000, februaryPrice: 100000, promoPrice: 12500, weekendPrice: 19000, selectedPriceType: 'standard' },
  { id: '9', category: 'Duplex', number: '25', description: '1 Mat; 2 singles 1 baño y toilete', capacity: '4pax', colorClass: 'bg-orange-100', basePrice: 15000, januaryPrice: 100000, februaryPrice: 90000, promoPrice: 12000, weekendPrice: 18000, selectedPriceType: 'standard' },
  { id: '10', category: 'Triplex', number: '26', description: '1 mat; 3 single', capacity: 'TX6pax', colorClass: 'bg-purple-600 text-white', basePrice: 15000, januaryPrice: 125000, februaryPrice: 115000, promoPrice: 13500, weekendPrice: 22000, selectedPriceType: 'standard' },
  { id: '11', category: 'Escalera', number: '10', description: '1 Ma; 2pax', capacity: '2pax', colorClass: 'bg-orange-100', basePrice: 15000, januaryPrice: 80000, februaryPrice: 70000, promoPrice: 10000, weekendPrice: 16000, selectedPriceType: 'standard' },
  { id: '12', category: 'Barlovento', number: '32', description: '1 mat; 3 single + Se puede agr 1 cama', capacity: '', colorClass: 'bg-orange-100', basePrice: 15000, januaryPrice: 100000, februaryPrice: 90000, promoPrice: 12000, weekendPrice: 18000, selectedPriceType: 'standard' },
  { id: '13', category: 'Barlovento', number: '15', description: '1 mat; 1 single', capacity: '3 pax', colorClass: 'bg-orange-100', basePrice: 15000, januaryPrice: 90000, februaryPrice: 80000, promoPrice: 11000, weekendPrice: 17000, selectedPriceType: 'standard' },
  { id: '14', category: 'Barlovento', number: '31', description: '1 Mat; 3 singles S/ bañera', capacity: '5pax', colorClass: 'bg-orange-100', basePrice: 15000, januaryPrice: 100000, februaryPrice: 90000, promoPrice: 12000, weekendPrice: 18000, selectedPriceType: 'standard' },
];

// Estados por color
export const COLORS = [
  { name: 'Reservado (No pagado)', class: 'bg-sky-400' },
  { name: 'Pagado', class: 'bg-green-600' },
  { name: 'Pagado y Confirmado', class: 'bg-red-600' },
];
