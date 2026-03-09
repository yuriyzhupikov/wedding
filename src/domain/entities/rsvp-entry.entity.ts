export interface RsvpEntryProps {
  id?: string | null;
  fullName: string;
  phone?: string | null;
  attending: boolean;
  guestsCount?: number | null;
  plusOne?: boolean | null;
  partnerName?: string | null;
  withChildren?: boolean | null;
  childrenDetails?: string | null;
  drinks?: string[] | null;
  allergyDetails?: string | null;
  message?: string | null;
  createdAt: Date;
}

/**
 * Domain entity that represents a single RSVP submission.
 */
export class RsvpEntry {
  private constructor(private readonly props: RsvpEntryProps) {}

  static create(
    props: Omit<RsvpEntryProps, 'createdAt'> & { createdAt?: Date },
  ): RsvpEntry {
    return new RsvpEntry({
      ...props,
      drinks: props.drinks ? [...props.drinks] : props.drinks,
      createdAt: props.createdAt ?? new Date(),
    });
  }

  static rehydrate(props: RsvpEntryProps): RsvpEntry {
    return new RsvpEntry({
      ...props,
      drinks: props.drinks ? [...props.drinks] : props.drinks,
    });
  }

  withId(id: string): RsvpEntry {
    return new RsvpEntry({ ...this.props, id });
  }

  get id(): string | null {
    return this.props.id ?? null;
  }

  get fullName(): string {
    return this.props.fullName;
  }

  get phone(): string | null {
    return this.props.phone ?? null;
  }

  get attending(): boolean {
    return this.props.attending;
  }

  get guestsCount(): number | null {
    return this.props.guestsCount ?? null;
  }

  get plusOne(): boolean | null {
    return this.props.plusOne ?? null;
  }

  get partnerName(): string | null {
    return this.props.partnerName ?? null;
  }

  get withChildren(): boolean | null {
    return this.props.withChildren ?? null;
  }

  get childrenDetails(): string | null {
    return this.props.childrenDetails ?? null;
  }

  get drinks(): string[] | null {
    return this.props.drinks ? [...this.props.drinks] : null;
  }

  get allergyDetails(): string | null {
    return this.props.allergyDetails ?? null;
  }

  get message(): string | null {
    return this.props.message ?? null;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  toObject(): RsvpEntryProps {
    return {
      ...this.props,
      drinks: this.props.drinks ? [...this.props.drinks] : this.props.drinks,
    };
  }
}
