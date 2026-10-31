ALTER TABLE "BloqueoHorario" ADD COLUMN "tipo" TEXT NOT NULL DEFAULT 'BLOQUEO', ADD COLUMN "citasAfectadasJson" TEXT;
CREATE TABLE "FilaPresencial" ("id" TEXT NOT NULL PRIMARY KEY,"tenantId" TEXT NOT NULL,"sucursalId" TEXT NOT NULL,"clienteNombre" TEXT,"clienteTelefono" TEXT,"serviciosJson" TEXT NOT NULL,"barberoPreferidoId" TEXT,"barberoId" TEXT,"citaId" TEXT,"estado" TEXT NOT NULL DEFAULT 'ESPERANDO',"version" INTEGER NOT NULL DEFAULT 0,"fechaLlegada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"usuarioId" TEXT NOT NULL,"motivoRetiro" TEXT);
CREATE UNIQUE INDEX "FilaPresencial_citaId_key" ON "FilaPresencial"("citaId");
CREATE INDEX "FilaPresencial_tenantId_sucursalId_estado_fechaLlegada_idx" ON "FilaPresencial"("tenantId","sucursalId","estado","fechaLlegada");
CREATE TABLE "OperacionAgenda" ("id" TEXT NOT NULL PRIMARY KEY,"tenantId" TEXT NOT NULL,"clave" TEXT NOT NULL,"requestHash" TEXT NOT NULL,"respuesta" TEXT,"fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX "OperacionAgenda_tenantId_clave_key" ON "OperacionAgenda"("tenantId","clave");
CREATE TABLE "TurnoEspecial" ("id" TEXT NOT NULL PRIMARY KEY,"tenantId" TEXT NOT NULL,"sucursalId" TEXT NOT NULL,"barberoId" TEXT NOT NULL,"fecha" TEXT NOT NULL,"horarioInicio" TEXT NOT NULL,"horarioFin" TEXT NOT NULL,"motivo" TEXT NOT NULL,"version" INTEGER NOT NULL DEFAULT 1,"usuarioId" TEXT NOT NULL,"fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX "TurnoEspecial_tenantId_barberoId_fecha_key" ON "TurnoEspecial"("tenantId","barberoId","fecha");
CREATE INDEX "TurnoEspecial_tenantId_sucursalId_fecha_idx" ON "TurnoEspecial"("tenantId","sucursalId","fecha");
