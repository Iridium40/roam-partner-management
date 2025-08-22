import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  MapPin,
  Search,
  Navigation,
  Target,
  AlertCircle,
  CheckCircle,
  Loader2,
  Settings,
  Circle,
} from "lucide-react";

interface Coordinates {
  lat: number;
  lng: number;
}

interface Location {
  address: string;
  coordinates: Coordinates;
  placeId?: string;
  formattedAddress?: string;
}

interface LocationPickerProps {
  initialLocation?: Coordinates;
  onLocationSelect: (location: Location) => void;
  showServiceRadius?: boolean;
  onRadiusChange?: (radius: number) => void;
  initialRadius?: number;
  className?: string;
}

interface PlaceSuggestion {
  description: string;
  placeId: string;
  mainText: string;
  secondaryText: string;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  initialLocation,
  onLocationSelect,
  showServiceRadius = false,
  onRadiusChange,
  initialRadius = 25,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null,
  );
  const [serviceRadius, setServiceRadius] = useState(initialRadius);
  const [currentPosition, setCurrentPosition] = useState<Coordinates | null>(
    null,
  );
  const [mapsLoaded, setMapsLoaded] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const autocompleteService =
    useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const geocoder = useRef<google.maps.Geocoder | null>(null);

  useEffect(() => {
    loadGoogleMapsScript();
  }, []);

  useEffect(() => {
    if (mapsLoaded && isOpen) {
      initializeMap();
    }
  }, [mapsLoaded, isOpen]);

  useEffect(() => {
    if (onRadiusChange) {
      onRadiusChange(serviceRadius);
    }
  }, [serviceRadius, onRadiusChange]);

  const loadGoogleMapsScript = () => {
    if (window.google?.maps) {
      setMapsLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.onload = () => setMapsLoaded(true);
    script.onerror = () => console.error("Failed to load Google Maps script");
    document.head.appendChild(script);
  };

  const initializeMap = () => {
    if (!mapRef.current || !window.google?.maps) return;

    setMapLoading(true);

    const defaultCenter = initialLocation || { lat: 25.7617, lng: -80.1918 }; // Miami default

    mapInstance.current = new google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    // Initialize services
    autocompleteService.current = new google.maps.places.AutocompleteService();
    placesService.current = new google.maps.places.PlacesService(
      mapInstance.current,
    );
    geocoder.current = new google.maps.Geocoder();

    // Add click listener to map
    mapInstance.current.addListener(
      "click",
      (event: google.maps.MapMouseEvent) => {
        const latLng = event.latLng;
        if (latLng) {
          const coordinates = { lat: latLng.lat(), lng: latLng.lng() };
          reverseGeocode(coordinates);
        }
      },
    );

    // Add marker if initial location provided
    if (initialLocation) {
      addMarker(initialLocation);
      if (showServiceRadius) {
        addServiceRadiusCircle(initialLocation, serviceRadius);
      }
    }

    setMapLoading(false);
  };

  const addMarker = (coordinates: Coordinates) => {
    if (!mapInstance.current || !window.google?.maps) return;

    // Remove existing marker
    if (markerRef.current) {
      markerRef.current.setMap(null);
    }

    markerRef.current = new google.maps.Marker({
      position: coordinates,
      map: mapInstance.current,
      draggable: true,
      animation: google.maps.Animation.DROP,
    });

    // Add drag listener
    markerRef.current.addListener(
      "dragend",
      (event: google.maps.MapMouseEvent) => {
        const latLng = event.latLng;
        if (latLng) {
          const newCoordinates = { lat: latLng.lat(), lng: latLng.lng() };
          reverseGeocode(newCoordinates);
          if (showServiceRadius && circleRef.current) {
            circleRef.current.setCenter(newCoordinates);
          }
        }
      },
    );

    mapInstance.current.setCenter(coordinates);
  };

  const addServiceRadiusCircle = (
    center: Coordinates,
    radiusInMiles: number,
  ) => {
    if (!mapInstance.current || !window.google?.maps) return;

    // Remove existing circle
    if (circleRef.current) {
      circleRef.current.setMap(null);
    }

    const radiusInMeters = radiusInMiles * 1609.34; // Convert miles to meters

    circleRef.current = new google.maps.Circle({
      strokeColor: "#3b82f6",
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: "#3b82f6",
      fillOpacity: 0.1,
      map: mapInstance.current,
      center: center,
      radius: radiusInMeters,
    });
  };

  const reverseGeocode = async (coordinates: Coordinates) => {
    if (!geocoder.current) return;

    setLoading(true);
    try {
      const results = await new Promise<google.maps.GeocoderResult[]>(
        (resolve, reject) => {
          geocoder.current!.geocode(
            { location: coordinates },
            (results, status) => {
              if (status === "OK" && results) {
                resolve(results);
              } else {
                reject(new Error("Geocoding failed"));
              }
            },
          );
        },
      );

      if (results.length > 0) {
        const result = results[0];
        const location: Location = {
          address: result.formatted_address,
          coordinates,
          placeId: result.place_id,
          formattedAddress: result.formatted_address,
        };
        setSelectedLocation(location);
      }
    } catch (error) {
      console.error("Reverse geocoding error:", error);
    } finally {
      setLoading(false);
    }
  };

  const searchPlaces = async (query: string) => {
    if (!autocompleteService.current || query.length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      const predictions = await new Promise<
        google.maps.places.AutocompletePrediction[]
      >((resolve, reject) => {
        autocompleteService.current!.getPlacePredictions(
          {
            input: query,
            types: ["establishment", "geocode"],
            componentRestrictions: { country: "us" },
          },
          (predictions, status) => {
            if (
              status === google.maps.places.PlacesServiceStatus.OK &&
              predictions
            ) {
              resolve(predictions);
            } else {
              resolve([]);
            }
          },
        );
      });

      const formattedSuggestions: PlaceSuggestion[] = predictions.map(
        (prediction) => ({
          description: prediction.description,
          placeId: prediction.place_id,
          mainText: prediction.structured_formatting.main_text,
          secondaryText: prediction.structured_formatting.secondary_text,
        }),
      );

      setSuggestions(formattedSuggestions);
    } catch (error) {
      console.error("Places search error:", error);
    }
  };

  const selectPlace = async (placeId: string) => {
    if (!placesService.current) return;

    setLoading(true);
    try {
      const place = await new Promise<google.maps.places.PlaceResult>(
        (resolve, reject) => {
          placesService.current!.getDetails(
            { placeId, fields: ["geometry", "formatted_address", "name"] },
            (place, status) => {
              if (
                status === google.maps.places.PlacesServiceStatus.OK &&
                place
              ) {
                resolve(place);
              } else {
                reject(new Error("Place details failed"));
              }
            },
          );
        },
      );

      if (place.geometry?.location) {
        const coordinates = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };

        const location: Location = {
          address: place.formatted_address || place.name || "",
          coordinates,
          placeId,
          formattedAddress: place.formatted_address,
        };

        setSelectedLocation(location);
        addMarker(coordinates);

        if (showServiceRadius) {
          addServiceRadiusCircle(coordinates, serviceRadius);
        }

        setSuggestions([]);
        setSearchQuery("");
      }
    } catch (error) {
      console.error("Place selection error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCurrentPosition(coordinates);
        addMarker(coordinates);
        reverseGeocode(coordinates);

        if (showServiceRadius) {
          addServiceRadiusCircle(coordinates, serviceRadius);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Unable to get your current location.");
        setLoading(false);
      },
    );
  };

  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation);
      setIsOpen(false);
    }
  };

  const handleRadiusChange = (values: number[]) => {
    const newRadius = values[0];
    setServiceRadius(newRadius);

    if (circleRef.current) {
      const radiusInMeters = newRadius * 1609.34;
      circleRef.current.setRadius(radiusInMeters);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={className}>
          <MapPin className="w-4 h-4 mr-2" />
          Choose Location
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Select Location</DialogTitle>
          <DialogDescription>
            Choose your business location or service area. You can search for an
            address, use your current location, or click directly on the map.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/60" />
            <Input
              placeholder="Search for an address or business..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchPlaces(e.target.value);
              }}
              className="pl-10"
            />

            {/* Search Suggestions */}
            {suggestions.length > 0 && (
              <Card className="absolute top-full left-0 right-0 z-10 mt-1">
                <CardContent className="p-2">
                  {suggestions.map((suggestion) => (
                    <Button
                      key={suggestion.placeId}
                      variant="ghost"
                      className="w-full justify-start text-left p-2 h-auto"
                      onClick={() => selectPlace(suggestion.placeId)}
                    >
                      <MapPin className="w-4 h-4 mr-2 text-foreground/60" />
                      <div>
                        <div className="font-medium">{suggestion.mainText}</div>
                        <div className="text-sm text-foreground/60">
                          {suggestion.secondaryText}
                        </div>
                      </div>
                    </Button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Current Location Button */}
          <Button
            variant="outline"
            onClick={getCurrentLocation}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Navigation className="w-4 h-4 mr-2" />
            )}
            Use Current Location
          </Button>

          {/* Service Radius Slider */}
          {showServiceRadius && (
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">Service Radius</Label>
                    <Badge variant="secondary">{serviceRadius} miles</Badge>
                  </div>
                  <Slider
                    value={[serviceRadius]}
                    onValueChange={handleRadiusChange}
                    min={1}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-sm text-foreground/60">
                    The radius for mobile services from this location.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Map Container */}
          <div className="relative">
            <div
              ref={mapRef}
              className="w-full h-96 bg-gray-100 rounded-lg border"
            />

            {mapLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
                <div className="text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-foreground/60">Loading map...</p>
                </div>
              </div>
            )}

            {!mapsLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                <div className="text-center">
                  <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                  <p className="text-sm text-foreground/60">
                    Failed to load Google Maps
                  </p>
                  <p className="text-xs text-foreground/40">
                    Check your internet connection
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Selected Location Display */}
          {selectedLocation && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Selected:</strong>{" "}
                {selectedLocation.formattedAddress || selectedLocation.address}
              </AlertDescription>
            </Alert>
          )}

          {/* Instructions */}
          <Alert>
            <Target className="h-4 w-4" />
            <AlertDescription>
              <strong>Tips:</strong> Search for an address above, click "Use
              Current Location", or click directly on the map to set your
              location. You can drag the marker to fine-tune the position.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedLocation || loading}
            className="bg-roam-blue hover:bg-roam-blue/90"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            Confirm Location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
