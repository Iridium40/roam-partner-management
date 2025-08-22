import { supabase } from "@/lib/supabase";

export const testBookingQueries = async () => {
  console.log("=== Testing Booking Queries ===");

  // Test 0: Check table existence with simple counts
  console.log("0. Checking basic table access...");
  try {
    const { count: customerCount, error: customerCountError } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });
    console.log("Customers table:", customerCountError ? customerCountError : `${customerCount} records`);

    const { count: bookingCount, error: bookingCountError } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true });
    console.log("Bookings table:", bookingCountError ? bookingCountError : `${bookingCount} records`);

    const { count: serviceCount, error: serviceCountError } = await supabase
      .from('services')
      .select('*', { count: 'exact', head: true });
    console.log("Services table:", serviceCountError ? serviceCountError : `${serviceCount} records`);

    const { count: providerCount, error: providerCountError } = await supabase
      .from('providers')
      .select('*', { count: 'exact', head: true });
    console.log("Providers table:", providerCountError ? providerCountError : `${providerCount} records`);
  } catch (e) {
    console.error("Table access error:", e);
  }

  // Test 1: Check if customers table has the test customer
  console.log("1. Checking customers table...");
  const { data: customers, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .eq('email', 'customer@roamyourbestlife.com');

  if (customerError) {
    console.error("Customer query error:", customerError);
  } else {
    console.log("Customer data:", customers);
  }

  // Test 2: Check current user session
  console.log("2. Checking current user session...");
  const { data: session, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    console.error("Session error:", sessionError);
  } else {
    console.log("Current session:", session?.session?.user?.email);
  }

  // Test 3: Check all bookings
  console.log("3. Checking all bookings...");
  const { data: allBookings, error: allBookingsError } = await supabase
    .from('bookings')
    .select('*')
    .limit(10);

  if (allBookingsError) {
    console.error("All bookings query error:", allBookingsError);
  } else {
    console.log("All bookings:", allBookings);
  }

  // Test 4: Check bookings by guest email
  console.log("4. Checking bookings by guest email...");
  const { data: guestBookings, error: guestError } = await supabase
    .from('bookings')
    .select('*')
    .eq('guest_email', 'customer@roamyourbestlife.com');

  if (guestError) {
    console.error("Guest bookings query error:", guestError);
  } else {
    console.log("Guest bookings:", guestBookings);
  }

  // Test 5: Check services table
  console.log("5. Checking services table...");
  const { data: services, error: servicesError } = await supabase
    .from('services')
    .select('*')
    .limit(5);

  if (servicesError) {
    console.error("Services query error:", servicesError);
  } else {
    console.log("Services:", services);
  }

  // Test 6: Check providers table
  console.log("6. Checking providers table...");
  const { data: providers, error: providersError } = await supabase
    .from('providers')
    .select('*')
    .limit(5);

  if (providersError) {
    console.error("Providers query error:", providersError);
  } else {
    console.log("Providers:", providers);
  }

  console.log("=== End Testing ===");
};

// Auto-run the test when imported
if (typeof window !== 'undefined') {
  testBookingQueries();
}
