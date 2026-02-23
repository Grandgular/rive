/**
 * Represents a color value in RGBA format for Rive animations.
 * All components are in the range 0-255.
 */
export interface RiveColor {
  /** Red component (0-255) */
  r: number;
  /** Green component (0-255) */
  g: number;
  /** Blue component (0-255) */
  b: number;
  /** Alpha component (0-255), defaults to 255 (fully opaque) */
  a: number;
}

/**
 * Union type representing all possible data binding values.
 * Used in the dataBindings input to support multiple property types.
 */
export type DataBindingValue = number | string | boolean | RiveColor;

/**
 * Enum representing the type of a ViewModel property.
 * Used for type detection and validation.
 */
export type DataBindingPropertyType =
  | 'number'
  | 'string'
  | 'boolean'
  | 'color'
  | 'enum'
  | 'trigger';

/**
 * Event emitted when a ViewModel property changes from within the animation.
 * This enables two-way data binding between the animation and Angular application.
 */
export interface DataBindingChangeEvent {
  /** Path to the property in the ViewModel */
  path: string;
  /** New value of the property */
  value: DataBindingValue;
  /** Type of the property that changed */
  propertyType: DataBindingPropertyType;
}
