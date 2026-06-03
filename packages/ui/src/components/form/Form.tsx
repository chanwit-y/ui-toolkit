import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, type FieldValues, type UseFormReturn } from "react-hook-form";
import { createContext, useEffect } from "react";


export class Form<T extends FieldValues = FieldValues> {


  private _schema: any;
  private _defaultValues?: any;
  public _form: UseFormReturn<any, unknown, any> | undefined;

  constructor(schema: any, defaultValues?: any) {
    this._schema = schema;
    this._defaultValues = defaultValues;
  }


  public setup(

  ) {
    return this
  }


  public getError() {
    return this._form?.formState.errors;
  }

  public container(El: () => React.ReactNode) {
    return <El />
  }


  public create<
    C extends FieldValues = FieldValues,
    P extends Record<string, any> = {}>() {
    const Context = createContext<C>({} as C)

    return {
      // Pv: <T extends any>(
      //   El: () => React.ReactNode
      // ) => { 
      //   this._form = useForm({
      //     mode: "all",
      //     resolver: zodResolver(this._schema),
      //     defaultValues: this._defaultValues,
      //   })


      //   return (<FormProvider {...this._form}>
      //     <Context value={{} as C}>
      //       <El />
      //     </Context>
      //   </FormProvider>)
      // },
      Fn: (props: P & { children: (f: Form<T>) => React.ReactNode }) => {
        const { children } = props
        this._form = useForm({
          mode: "all",
          resolver: zodResolver(this._schema),
          defaultValues: this._defaultValues,
        })

        useEffect(() => {
          this._form?.trigger();
        }, [])

        return (<FormProvider {...this._form}>
          <Context.Provider value={{} as C}>
            {children(this)}
          </Context.Provider>
        </FormProvider>)
      },
      El: (props: P & { children: React.ReactNode }) => {
        const { children } = props
        this._form = useForm({
          mode: "all",
          resolver: zodResolver(this._schema),
          defaultValues: this._defaultValues,
        })
        return (<FormProvider {...this._form}>
          <Context.Provider value={{} as C}>
            {children}
          </Context.Provider>
        </FormProvider>)
      }
    }



  }

}

// export class Form<T extends FieldValues = FieldValues> {
//   private readonly _schema: ZodAny;
//   private readonly _defaultValues?: DefaultValues<T>;

//   constructor(schema: ZodAny, defaultValues?: DefaultValues<T>) {
//     this._schema = schema;
//     this._defaultValues = defaultValues;
//   }

//   public it<C extends FieldValues = FieldValues, P extends Record<string, any> = {}>(schema: ZodAny, defaultValues?: DefaultValues<T>) {
//     const Context = createContext<C>({} as C)

//     return (props: P & { children: React.ReactNode }) => {
//       const { children } = props
//       const form = useForm({
//         mode: "all",
//         resolver: zodResolver(this._schema),
//         defaultValues: this._defaultValues,
//       })
//       return (<FormProvider {...form}>
//         <Context value={{} as C}>
//           {children}
//         </Context>
//       </FormProvider>)
//     }
//   }


//   // constructor(private x: string) {}
//   // constructor(
//   //   private _schema: any,
//   //   // private _defaultValues?: DeepPartial<T>
//   // ) {
//   //   // this._schema = _schema;
//   //   // this._defaultValues = _defaultValues;
//   // }

//   // public  getx <T extends FieldValues = FieldValues>(
//   //   schema: ZodAny
//   //   // defaultValues?: UnpackNestedValue<DeepPartial<T>>
//   // ): UseFormProps<FieldValues, object> => {
//   //   return {
//   //     mode: "all",
//   //     // reValidateMode: "onChange",
//   //     // criteriaMode: "firstError",
//   //     // shouldFocusError: true,
//   //     // shouldUnregister: true,
//   //     resolver: zodResolver(schema),
//   //     // defaultValues,
//   //   };
//   // };
// }
