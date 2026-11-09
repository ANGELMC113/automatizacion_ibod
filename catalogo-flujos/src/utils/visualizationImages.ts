
import { Archivo } from '../types/lineage';

export const getLatestVisualizationImage = (
  elementId: number,
  archivos: Archivo[]
): Archivo | undefined => {
  return archivos
    .filter((archivo) => {
      if (archivo.id_elemento !== elementId) return false;

      const path = archivo.path.toLowerCase();
      const format = archivo.formato?.toLowerCase();

      return (
        ['png', 'jpg', 'jpeg'].includes(format ?? '') ||
        /\.(png|jpe?g)$/.test(path)
      );
    })
    .sort((a, b) => {
      // Most recently dated file first.
      const dateComparison = b.fecha.localeCompare(a.fecha);

      // If dates are equal, use the highest ID as the latest.
      return dateComparison || b.id_archivo - a.id_archivo;
    })[0];
};

export const getVisualizationImageUrl = (
  archivo: Archivo | undefined
): string | undefined => {
  return archivo?.previewImageUrl || archivo?.path || undefined;
};
