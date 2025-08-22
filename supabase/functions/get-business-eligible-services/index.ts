import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get business_id from query parameters
    const url = new URL(req.url)
    const businessId = url.searchParams.get('business_id')

    if (!businessId) {
      return new Response(
        JSON.stringify({ error: 'business_id parameter is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get business details and its subcategories
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select(`
        id,
        business_subcategories!inner(
          subcategory_id,
          service_subcategories(id, service_subcategory_type)
        )
      `)
      .eq('id', businessId)
      .single()

    if (businessError) {
      console.error('Error fetching business:', businessError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch business details', details: businessError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!business) {
      return new Response(
        JSON.stringify({ error: 'Business not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Extract subcategory IDs
    const subcategoryIds = business.business_subcategories?.map(
      (bs: any) => bs.subcategory_id
    ) || []

    if (subcategoryIds.length === 0) {
      console.log('No subcategories found for business:', businessId)
      return new Response(
        JSON.stringify({
          business_id: businessId,
          service_count: 0,
          addon_count: 0,
          eligible_services: [],
          eligible_addons: [],
          service_addon_map: {}
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get eligible services based on business subcategories
    const { data: eligibleServices, error: servicesError } = await supabaseAdmin
      .from('services')
      .select(`
        id, 
        name, 
        description, 
        min_price,
        duration_minutes, 
        image_url, 
        is_active,
        subcategory_id,
        service_subcategories(
          service_subcategory_type,
          service_categories(service_category_type)
        )
      `)
      .in('subcategory_id', subcategoryIds)
      .eq('is_active', true)

    if (servicesError) {
      console.error('Error fetching eligible services:', servicesError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch eligible services', details: servicesError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get service addons
    const { data: eligibleAddons, error: addonsError } = await supabaseAdmin
      .from('service_addons')
      .select('id, name, description, image_url')
      .eq('is_active', true)

    if (addonsError) {
      console.error('Error fetching eligible addons:', addonsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch eligible addons', details: addonsError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get service-addon mappings
    const { data: serviceAddonMappings, error: mappingError } = await supabaseAdmin
      .from('service_addon_compatibility')
      .select('service_id, addon_id')

    if (mappingError) {
      console.error('Error fetching service-addon mappings:', mappingError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch service-addon mappings', details: mappingError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Create service-addon map
    const serviceAddonMap: Record<string, string[]> = {}
    serviceAddonMappings?.forEach((mapping: any) => {
      if (!serviceAddonMap[mapping.service_id]) {
        serviceAddonMap[mapping.service_id] = []
      }
      serviceAddonMap[mapping.service_id].push(mapping.addon_id)
    })

    // Get current business services to mark as configured
    const { data: businessServices, error: businessServicesError } = await supabaseAdmin
      .from('business_services')
      .select('service_id, business_price, delivery_type, is_active')
      .eq('business_id', businessId)

    if (businessServicesError) {
      console.error('Error fetching business services:', businessServicesError)
      // Don't return error, just continue without configured services
    }

    const configuredServiceIds = new Set(businessServices?.map(bs => bs.service_id) || [])
    const businessServicesMap = new Map(
      businessServices?.map(bs => [bs.service_id, bs]) || []
    )

    // Mark services as configured and add business-specific data
    const processedServices = eligibleServices?.map((service: any) => {
      const isConfigured = configuredServiceIds.has(service.id)
      const businessService = businessServicesMap.get(service.id)
      
      return {
        ...service,
        is_configured: isConfigured,
        business_price: businessService?.business_price,
        delivery_type: businessService?.delivery_type,
        business_is_active: businessService?.is_active
      }
    }) || []

    const response = {
      business_id: businessId,
      service_count: processedServices.length,
      addon_count: eligibleAddons?.length || 0,
      eligible_services: processedServices,
      eligible_addons: eligibleAddons || [],
      service_addon_map: serviceAddonMap
    }

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Unexpected error in get-business-eligible-services:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
