import { Customer } from '@/types/customer';

const STORAGE_KEY = 'smart_banking_customers';

export const saveCustomers = (customers: Customer[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
  } catch (error) {
    console.error('Error saving customers:', error);
  }
};

export const loadCustomers = (): Customer[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    const customers = JSON.parse(data);
    
    // Convert descriptor arrays back to Float32Array
    return customers.map((customer: Customer) => ({
      ...customer,
      faceDescriptors: {
        webcam: customer.faceDescriptors.webcam 
          ? new Float32Array(customer.faceDescriptors.webcam)
          : undefined,
        uploadedImage: customer.faceDescriptors.uploadedImage
          ? new Float32Array(customer.faceDescriptors.uploadedImage)
          : undefined,
      },
    }));
  } catch (error) {
    console.error('Error loading customers:', error);
    return [];
  }
};

export const saveCustomer = (customer: Customer): void => {
  const customers = loadCustomers();
  const existingIndex = customers.findIndex(c => c.id === customer.id);
  
  if (existingIndex >= 0) {
    customers[existingIndex] = customer;
  } else {
    customers.push(customer);
  }
  
  saveCustomers(customers);
};

export const findCustomerById = (id: string): Customer | null => {
  const customers = loadCustomers();
  return customers.find(c => c.id === id) || null;
};
