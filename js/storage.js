/* ParcelDesk storage layer — browser LocalStorage demo only. */
const STORAGE_KEY = "parceldesk_parcels_v1";

function readParcels() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error("Could not read saved parcels:", error);
    return [];
  }
}

function writeParcels(parcels) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(parcels));
}

function createSeedData() {
  const today = new Date();
  const earlier = new Date(Date.now() - 86400000);
  return [
    {id:"PKG-1001",studentName:"Rahul Sharma",recipientType:"Student",rollNumber:"12345678",hostelBlock:"BH-02",roomNumber:"214-B",destination:"BH-02 · 214-B",courier:"Blue Dart",trackingLast4:"7821",pickupToken:"4826",status:"Pending",receivedAt:today.toISOString(),deliveredAt:null,note:"Handle with care"},
    {id:"PKG-1002",studentName:"Priya Verma",recipientType:"Student",rollNumber:"12345679",hostelBlock:"GH-01",roomNumber:"108-A",destination:"GH-01 · 108-A",courier:"Delhivery",trackingLast4:"1940",pickupToken:"7315",status:"Delivered",receivedAt:earlier.toISOString(),deliveredAt:today.toISOString(),note:""},
    {id:"PKG-1003",studentName:"Aman Thakur",recipientType:"Student",rollNumber:"12345680",hostelBlock:"BH-01",roomNumber:"",destination:"BH-01",courier:"Amazon Logistics",trackingLast4:"5502",pickupToken:"2094",status:"Pending",receivedAt:today.toISOString(),deliveredAt:null,note:""}
  ];
}

function initializeStorage() {
  if (!localStorage.getItem(STORAGE_KEY)) writeParcels(createSeedData());
}

function getAllParcels() {
  return readParcels();
}

function saveParcel(parcel) {
  const parcels = readParcels();
  parcels.unshift(parcel);
  writeParcels(parcels);
}

function updateParcel(parcelId, updates) {
  const parcels = readParcels();
  const index = parcels.findIndex(parcel => parcel.id === parcelId);
  if (index === -1) return false;
  parcels[index] = {...parcels[index], ...updates};
  writeParcels(parcels);
  return true;
}

function removeParcel(parcelId) {
  writeParcels(readParcels().filter(parcel => parcel.id !== parcelId));
}

function resetStorage() {
  writeParcels(createSeedData());
}
