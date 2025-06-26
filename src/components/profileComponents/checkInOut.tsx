"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/app/context/AuthContext";
import { User } from "@/lib/interfaces";
import {
  crearMovimiento,
  obtenerMisMovimientos,
} from "@/services/movementsService";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { opcionesPorIncidencia } from "@/lib/movimientos";
import { addDays } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { DateRange } from "react-day-picker";
import Image from "next/image";

function RegisterCheckInCheckOut() {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [filtrarPorFecha, setFiltrarPorFecha] = useState(false);
  const [registros, setRegistros] = useState<{ date: string; type: "Entrada" | "Salida"; time: string }[]>([]);
  const [asistencias, setAsistencias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [empleado, setEmpleado] = useState<User | null>(null);
  const [quickModalOpen, setQuickModalOpen] = useState(false);
  const [movimientosSolicitados, setMovimientosSolicitados] = useState<any[]>([]);
  const [opcionesMovimiento, setOpcionesMovimiento] = useState<string[]>([]);
  type Incident = {
    numeroEmpleado: number;
    fecha: Date;
    tipoMovimiento: string;
    horaEntradaReal?: string;
    horaSalidaReal?: string;
  };

  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [comments, setComments] = useState("");
  const [requestStatus, setRequestStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
  from: undefined,
  to: undefined,
});

  const diasMap: Record<string, string> = {
    "Dom": "Domingo",
    "Lun": "Lunes",
    "Mar": "Martes",
    "Mi?": "Miércoles",
    "Jue": "Jueves",
    "Vie": "Viernes",
    "Sáb": "Sábado",
    "Sab": "Sábado",
  };

    const fetchMovimientos = async () => {
      if (!user || !user.num_empleado) return;
      const movimientos = await obtenerMisMovimientos(user.num_empleado);
      setMovimientosSolicitados(movimientos);
      
    };
    const fetchAsistencias = async () => {
      if (!user || !user.num_empleado) return;
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/asistencia?codigo=${user.num_empleado}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setAsistencias(json.data); // solo si json.success === true
      } catch (error) {
        console.error("Error al obtener datos de asistencia:", error);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {

    fetchMovimientos();
    fetchAsistencias();

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [user]);

  useEffect(() => {
    const fetchEmpleado = async () => {
      if (!user) return;
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/all`);
        const data = await response.json();
        const employeeData = data.find((u: any) => Number(u.Personal) === Number(user.num_empleado));
        setEmpleado(employeeData);
      } catch (err) {
        console.error("Error al cargar datos del empleado:", err);
      }
    };

    fetchEmpleado();
  }, [user]);

  const registrosFiltrados = registros.filter((r) => {
    if (filtrarPorFecha && startDate && endDate) {
      return r.date >= startDate && r.date <= endDate;
    }
    return true;
  });

  useEffect(() => {

  const timer = setInterval(() => setCurrentTime(new Date()), 1000);
  return () => clearInterval(timer);
}, [user]);

  const fechasConChecadasIncompletas = new Set<string>();
  const fechasAgrupadas = registrosFiltrados.reduce((acc, reg) => {
    if (!acc[reg.date]) acc[reg.date] = [];
    acc[reg.date].push(reg.type);
    return acc;
  }, {} as Record<string, string[]>);

  Object.entries(fechasAgrupadas).forEach(([fecha, tipos]) => {
    if (!(tipos.includes("Entrada") && tipos.includes("Salida"))) {
      fechasConChecadasIncompletas.add(fecha);
    }
  });

  const movimientosAprobados = movimientosSolicitados.filter(
  (m) => m.estatus_movimiento === "aprobado"
);

const fechasJustificadas = new Set(
  movimientosAprobados.map((m) => new Date(m.fecha_incidencia).toISOString().split("T")[0])
);
const movimientosPorFecha = Object.fromEntries(
  movimientosAprobados.map((m) => [new Date(m.fecha_incidencia).toISOString().split("T")[0], m.tipo_movimiento])
);


let asistenciasTotales = 0;
let retardosTotales = 0;
let inasistenciasTotales = 0;

asistencias.forEach((a) => {
  const fecha = a.FECHA.split("T")[0];
  const incidencia = a.NOMBRE_INCIDENCIA;
  const clave = a.CVEINC;

  const movimientoJustificado = fechasJustificadas.has(fecha);
  const tipoMovimiento = movimientosPorFecha[fecha];

  if (clave === "SD") {
    return; // día sin deber asistencia
  }

  if (incidencia === null) {
    // Asistencia normal
    asistenciasTotales++;
  } else if (incidencia === "Retardo E1") {
    if (movimientoJustificado && tipoMovimiento === "Retardo justificado") {
      asistenciasTotales++; // contar como asistencia normal
    } else {
      retardosTotales++;
    }
  } else {
    // Otras incidencias
    if (movimientoJustificado && tipoMovimiento === "Falta justificada") {
      asistenciasTotales++; // contar como asistencia normal
    } else {
      inasistenciasTotales++;
    }
  }
});


const totalDías = asistenciasTotales + retardosTotales + inasistenciasTotales;
const puntualidadPorcentaje = totalDías > 0
  ? Math.round((asistenciasTotales / totalDías) * 100)
  : 0;

  if (loading) {
    return <div className="p-6 text-center text-gray-600">Cargando registros de asistencia...</div>;
  }

  const handleQuickRequestOpciones = (item: any) => {
    const opciones = opcionesPorIncidencia[item.NOMBRE_INCIDENCIA] || [];

    setSelectedIncident({
      numeroEmpleado: user?.num_empleado ?? 0,
      fecha: new Date(item.FECHA),
      tipoMovimiento: opciones[0] || "",
      horaEntradaReal: item.ENTRADA_REAL,
      horaSalidaReal: item.SALIDA_REAL,
    });

    setOpcionesMovimiento(opciones);
    setQuickModalOpen(true);
  };


  const handleQuickSubmit = async () => {
    if (!selectedIncident) return;

    try {
      setRequestStatus("submitting");

      const payload = {
        num_empleado: selectedIncident.numeroEmpleado,
        tipo_movimiento: selectedIncident.tipoMovimiento,
        nivel_aprobacion: 1,
        fecha_incidencia: selectedIncident.fecha.toISOString().slice(0, 10),
        datos_json: {
          entryTime: selectedIncident.horaEntradaReal || "",
          earlyTime:
            selectedIncident.tipoMovimiento === "Salida anticipada"
              ? selectedIncident.horaSalidaReal
              : "",
          delayTime:
            selectedIncident.tipoMovimiento === "Retardo justificado"
              ? selectedIncident.horaEntradaReal
              : "",
          exitTime: "",
        },
        comentarios: comments || "",
      };

      const result = await crearMovimiento(payload);

      if (!result.success) {
        alert("Error creando movimiento rápido");
        setRequestStatus("error");
        return;
      }

      setRequestStatus("success");
      alert("✅ Solicitud rápida enviada");
      setQuickModalOpen(false);
      setComments("");
    } catch (error) {
      console.error("❌ Error en envío rápido:", error);
      setRequestStatus("error");
      alert("Error enviando solicitud rápida");
    }
  };
  const getEstiloFilaPorEstatus = (estatus: string | null) => {
  switch (estatus) {
    case "𝙎𝙊𝙇𝙄𝘾𝙄𝙏𝘼𝘿𝙊":
      return "bg-yellow-100 border-l-4 border-yellow-500 animate-pulse";
    case "𝘼𝙋𝙍𝙊𝘽𝘼𝘿𝙊":
      return "bg-green-100 border-l-4 border-green-600 shadow-md ring-2 ring-green-400";
    case "𝙍𝙀𝘾𝙃𝘼𝙕𝘼𝘿𝙊":
      return "bg-red-100 border-l-4 border-red-500";
    case "𝙋𝙀𝙉𝘿𝙄𝙀𝙉𝙏𝙀":
      return "bg-blue-100 border-l-4 border-blue-400";
    default:
      return "";
  }
};


const getEstatusMovimiento = (fecha: string) => {
  const match = movimientosSolicitados.find((mov) => {
    const fechaIncidencia = new Date(mov.fecha_incidencia);
    return fechaIncidencia.toISOString().split("T")[0] === fecha;
  });

  if (!match) return null;

  switch (match.estatus_movimiento) {
    case "pendiente":
      return { icono: "𝙎𝙊𝙇𝙄𝘾𝙄𝙏𝘼𝘿𝙊", tipo: match.tipo_movimiento };
    case "aprobado":
      return { icono: "𝘼𝙋𝙍𝙊𝘽𝘼𝘿𝙊", tipo: match.tipo_movimiento };
    case "rechazado":
      return { icono: "𝙍𝙀𝘾𝙃𝘼𝙕𝘼𝘿𝙊", tipo: match.tipo_movimiento };
    default:
      return { icono: "𝙋𝙀𝙉𝘿𝙄𝙀𝙉𝙏𝙀", tipo: match.tipo_movimiento };
  }
};



  return (
    <div className="max-w-fit mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda - Foto y Resumen */}
        <div className="space-y-6">
          {/* Card de Foto y datos principales */}
          <Card className="relative rounded-3xl shadow-lg border border-muted bg-white/80 backdrop-blur-md">
            <div className="absolute top-4 right-4">
              <Badge
                variant="outline"
                className={`px-3 py-1 text-sm font-medium rounded-full shadow-sm ${empleado?.Estatus === "ALTA"
                  ? "text-green-600 border-green-600"
                  : "text-red-600 border-red-600"
                  }`}
              >
                {empleado?.Estatus}
              </Badge>
            </div>

            <CardHeader className="flex flex-col items-center justify-center space-y-4 text-center">
<div className="w-32 h-32 rounded-full overflow-hidden border-2 border-gray-300">
  {empleado?.Personal ? (
    <Image
      width={128}
      height={128}
      src={`http://api-img.172.16.15.30.sslip.io/uploads/${empleado.Personal}.jpg`}
      alt="Foto del empleado"
      className="object-cover w-full h-full"
    />
  ) : (
    <div className="flex items-center justify-center w-full h-full bg-gray-200 text-xl font-semibold">
      {empleado?.Nombre?.[0]}
      {empleado?.ApellidoPaterno?.[0]}
    </div>
  )}
</div>


              <div>
                <CardTitle className="text-2xl font-semibold tracking-tight">
                  {empleado?.Nombre} {empleado?.ApellidoPaterno} {empleado?.ApellidoMaterno}
                </CardTitle>
                <p className="text-muted-foreground text-sm">#{empleado?.Personal}</p>
              </div>
            </CardHeader>

            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6 px-6 py-4">
              <InfoItem label="Puesto" value={empleado?.Puesto || ""} />
              <InfoItem label="Departamento" value={empleado?.Departamento || ""} />
              <InfoItem label="Tipo de Pago" value={empleado?.PeriodoTipo || "No especificado"} />
            </CardContent>
          </Card>

          {/* Card de Resumen de asistencia */}
          <Card className="bg-white/80 backdrop-blur-md rounded-2xl border shadow-md p-4">
            <CardHeader>
              <CardTitle>Resumen de asistencia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">

              <Separator className="my-4 h-1 bg-gray-200 rounded-full" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
                <InfoBox color="green" label="Asistencias" value={asistenciasTotales.toString()} />
                <InfoBox color="red" label="Inasistencias" value={inasistenciasTotales.toString()} />
                <InfoBox color="orange" label="Retardos" value={retardosTotales.toString()} />
                <InfoBox color="blue" label="Puntualidad" value={`${puntualidadPorcentaje}%`} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Columna derecha - Tabla de Asistencia */}
          <Card className="bg-white/80 backdrop-blur-md rounded-2xl border shadow-md p-2 h-fit lg:col-span-2">
            <div className="text-xl font-mono text-gray-600 justify-end flex">
              {currentTime.toLocaleTimeString()}
            </div>

            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
              <CardTitle className="text-lg text-center sm:text-left w-full sm:w-auto">
                Registros de Asistencia
              </CardTitle>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="text-sm">
                      {dateRange?.from && dateRange?.to
                        ? `${format(dateRange.from, "dd/MM/yyyy")} - ${format(dateRange.to, "dd/MM/yyyy")}`
                        : "📅 Filtrar por fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                    />
                  </PopoverContent>
                </Popover>

                <Button
                  variant="secondary"
                  onClick={() => {
                    fetchAsistencias();
                    fetchMovimientos();
                  }}
                  className="text-sm"
                >
                  🔄 Refrescar registros
                </Button>
              </div>
            </CardHeader>

            <CardContent className="overflow-x-auto">
              <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full text-sm text-left border">
                  <thead className="bg-gray-100 text-black sticky top-0 z-10">
                    <tr>
                      <th className="py-2 px-4">Fecha</th>
                      <th className="py-2 px-4">Día</th>
                      <th className="py-2 px-4">Entrada Prog.</th>
                      <th className="py-2 px-4">Salida Prog.</th>
                      <th className="py-2 px-4">Tipo Asistencia</th>
                      <th className="py-2 px-4">Incidencia</th>
                      <th className="py-2 px-4">Estatus</th>
                      <th className="py-2 px-4">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {asistencias
                      .filter((item) => item.CVEINC !== "SD")
                      .filter((item) => {
                        if (!dateRange?.from || !dateRange?.to) return true;
                        const fecha = new Date(item.FECHA);
                        return fecha >= dateRange.from && fecha <= addDays(dateRange.to, 1);
                      })
                      .sort((a, b) => new Date(b.FECHA).getTime() - new Date(a.FECHA).getTime())
                      .map((item, i) => {
                        const fechaStr = item.FECHA.split("T")[0];
                        const diaSemana = diasMap[item.DIA_SEM] || item.DIA_SEM;
                        const tipoMovimiento = item.NOMBRE_INCIDENCIA;
                        const resultadoMovimiento = getEstatusMovimiento(fechaStr);
                        const estatus = resultadoMovimiento?.icono || null;
                        const tipoMovimientoDetectado = resultadoMovimiento?.tipo || tipoMovimiento;

                        let bgColor = "";
                        if (estatus) {
                          bgColor = "bg-white";
                        } else {
                          if (item.NOMBRE_INCIDENCIA === null && item.CVEINC !== "SD") {
                            bgColor = "bg-green-50";
                          } else if (item.NOMBRE_INCIDENCIA === "Retardo E1") {
                            bgColor = "bg-yellow-50";
                          } else {
                            bgColor = "bg-red-50";
                          }
                        }

                        const claseFila = `${bgColor} ${getEstiloFilaPorEstatus(estatus)} border-b text-black`;

                        return (
                          <tr key={i} className={claseFila}>
                            <td className="py-2 px-4">{fechaStr}</td>
                            <td className="py-2 px-4">{diaSemana}</td>
                            <td className="py-2 px-4">
                              {item.ENTRADA_PROGRAMADA && item.ENTRADA_PROGRAMADA !== "00:00"
                                ? item.ENTRADA_PROGRAMADA
                                : "—"}
                            </td>
                            <td className="py-2 px-4">
                              {item.SALIDA_PROGRAMADA && item.SALIDA_PROGRAMADA !== "00:00"
                                ? item.SALIDA_PROGRAMADA
                                : "—"}
                            </td>
                            <td className="py-2 px-4">{item.TIPO_ASISTENCIA || "—"}</td>
                            <td className="py-2 px-4 italic text-sm">
                              {estatus
                                ? `Movimiento "${tipoMovimientoDetectado}"`
                                : item.NOMBRE_INCIDENCIA || "—"}
                            </td>
                            <td className="py-2 px-4">{estatus || "—"}</td>
                            <td className="py-2 px-4">
                              {item.NOMBRE_INCIDENCIA && item.CVEINC !== "SD" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleQuickRequestOpciones(item)}
                                  className="text-xs"
                                  disabled={!!getEstatusMovimiento(fechaStr)}
                                >
                                  Solicitar
                                </Button>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
      </div>
      <Dialog open={quickModalOpen} onOpenChange={setQuickModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitud rápida de movimiento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Número de empleado</Label>
              <Input value={selectedIncident?.numeroEmpleado || ""} disabled />
            </div>

            <div>
              <Label>Fecha</Label>
              <Input
                value={
                  selectedIncident?.fecha
                    ? format(selectedIncident.fecha, "yyyy-MM-dd")
                    : ""
                }
                disabled
              />
            </div>

            <div>
              <Label>Tipo de movimiento</Label>
              <select
                className="w-full border rounded-md p-2"
                value={selectedIncident?.tipoMovimiento}
                onChange={(e) =>
                  setSelectedIncident((prev) =>
                    prev ? { ...prev, tipoMovimiento: e.target.value } : null
                  )
                }
              >
                {opcionesMovimiento.map((opcion, idx) => (
                  <option key={idx} value={opcion}>
                    {opcion}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Comentarios</Label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Agrega un comentario si es necesario"
              />
            </div>

            <Button
              onClick={handleQuickSubmit}
              disabled={requestStatus === "submitting"}
            >
              {requestStatus === "submitting" ? "Enviando..." : "Enviar solicitud"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>

  );

}
const InfoItem = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="text-base font-medium">{value}</span>
  </div>
);
const InfoBox = ({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) => (
  <div className="bg-muted p-4 rounded-xl shadow-sm h-24 flex flex-col items-center justify-center w-full">
    <p className={`text-2xl font-bold text-${color}-500`}>{value}</p>
    <p className="text-sm text-gray-500 text-center">{label}</p>
  </div>
);

export default RegisterCheckInCheckOut;
