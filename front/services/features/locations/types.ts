export interface LocationResponse {
  latitude: number;
  longitude: number;
}

export interface CityResponse {
  id: number;
  name: string;
  slug: string;
  provinceId: number;
  location: LocationResponse;
}

export interface ProvinceResponse {
  id: number;
  name: string;
  slug: string;
  telPrefix: string;
  location: LocationResponse;
  cities: CityResponse[];
}
