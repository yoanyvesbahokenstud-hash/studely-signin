import { InjectionToken } from '@angular/core';
import { Environment } from '@env/environment.model';

export type AppConfig = Environment;

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');
