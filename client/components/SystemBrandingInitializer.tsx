import { useEffect } from 'react';
import { useSystemConfig } from '@/hooks/useSystemConfig';

/**
 * Component that initializes system branding (favicon, logo) on app startup
 * This component doesn't render anything visible - it just handles the initialization
 */
export function SystemBrandingInitializer() {
  const { config, loading, error } = useSystemConfig();

  useEffect(() => {
    if (!loading && !error) {
      console.log('🎨 System branding initialized successfully');
      
      // Update document title if needed
      if (config.site_logo) {
        console.log('🖼️ Site logo available:', config.site_logo);
      }
      
      if (config.favicon) {
        console.log('🔗 Favicon updated:', config.favicon);
      }
    }
    
    if (error) {
      console.warn('⚠️ System branding initialization failed:', error);
    }
  }, [config, loading, error]);

  // This component doesn't render anything
  return null;
}

export default SystemBrandingInitializer;
