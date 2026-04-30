import { injectable, inject } from "inversify";
import type {
  ISettingsService,
  IStorageService,
  IValidationService,
} from "../interfaces/services";
import type { AppSettings, CounterSettings } from "../schemas/settings";
import { AppSettingsSchema, CounterSettingsSchema } from "../schemas/settings";
import { TYPES } from "../types/symbols";

@injectable()
export class SettingsService implements ISettingsService {
  private readonly APP_SETTINGS_KEY = "app-settings";
  private readonly COUNTER_SETTINGS_KEY = "counter-settings";

  constructor(
    @inject(TYPES.StorageService) private storageService: IStorageService,
    @inject(TYPES.ValidationService)
    private validationService: IValidationService,
  ) {}

  getAppSettings(): AppSettings {
    const stored = this.storageService.get<AppSettings>(this.APP_SETTINGS_KEY);
    if (stored && this.validationService.isValid(AppSettingsSchema, stored)) {
      return this.validationService.validate(AppSettingsSchema, stored);
    }
    return AppSettingsSchema.parse({});
  }

  updateAppSettings(settings: Partial<AppSettings>): void {
    const current = this.getAppSettings();
    const updated = { ...current, ...settings };
    const validated = this.validationService.validate(
      AppSettingsSchema,
      updated,
    );
    this.storageService.set(this.APP_SETTINGS_KEY, validated);
  }

  getCounterSettings(): CounterSettings {
    const stored = this.storageService.get<CounterSettings>(
      this.COUNTER_SETTINGS_KEY,
    );
    if (
      stored &&
      this.validationService.isValid(CounterSettingsSchema, stored)
    ) {
      return this.validationService.validate(CounterSettingsSchema, stored);
    }
    return CounterSettingsSchema.parse({});
  }

  updateCounterSettings(settings: Partial<CounterSettings>): void {
    const current = this.getCounterSettings();
    const updated = { ...current, ...settings };
    const validated = this.validationService.validate(
      CounterSettingsSchema,
      updated,
    );
    this.storageService.set(this.COUNTER_SETTINGS_KEY, validated);
  }
}
