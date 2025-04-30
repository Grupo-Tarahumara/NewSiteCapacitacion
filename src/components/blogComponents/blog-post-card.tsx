import React, { useState } from "react";
import axios from "axios";
import Image from "next/image";
import {
  Typography,
  Card,
  CardHeader,
  CardBody,
  Avatar,
  Button,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Input,
  Carousel,
  IconButton,
} from "@material-tailwind/react";

import { Post } from "./postsPage";
import { useAuth } from "@/hooks/useAuth";

interface BlogPostCardProps {
  img: string[];
  tag: string;
  title: string;
  desc: string;
  author: { name: string; img: string };
  date: string;
  idBlog: number;
  num_empleado: number;
  likes: number;
  videoUrl?: string;
  onPostEdit: (post: Post) => void;
  onPostDelete: (idBlog: number) => void;
}

export function BlogPostCard({
  img,
  tag,
  title,
  desc,
  author,
  date,
  idBlog,
  num_empleado,
  likes,
  videoUrl,
  onPostEdit,
  onPostDelete,
}: BlogPostCardProps) {
  const formattedUserId = num_empleado.toString().padStart(4, "0");
  const [openModal, setOpenModal] = useState(false);
  const [statusLike, setStatusLike] = useState(false);
  const [post, setPost] = useState<Post>({
    idBlog: idBlog,
    img: Array.isArray(img) ? img : [],
    tag: tag,
    title: title,
    desc: desc,
    date: date,
    img_author: author.img,
    name_author: author.name,
    num_empleado: num_empleado,
    likes: likes,
    videoUrl: videoUrl,
  });

  // Estado para las imágenes nuevas seleccionadas durante la edición
  const [newImgFiles, setNewImgFiles] = useState<File[]>([]);

  const extractYouTubeID = (url: string) => {
    const regExp = /(?:youtube\.com.*(?:\?|&)v=|youtu\.be\/)([^&#]*)/;
    const match = url.match(regExp);
    return match && match[1] ? match[1] : "";
  };

  const { isAuthenticated } = useAuth();

  const handleEditClick = () => {
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    // Limpiar las imágenes nuevas al cerrar el modal
    setNewImgFiles([]);
  };

  // Función para eliminar una imagen de la lista actual
  const handleRemoveImage = (index: number) => {
    const updatedImages = [...post.img];
    updatedImages.splice(index, 1);
    setPost({ ...post, img: updatedImages });
  };

  const handleEdit = async () => {
    // Toma las imágenes actuales (ya con las eliminaciones realizadas)
    let updatedImages = [...post.img];

    // Si se seleccionaron nuevas imágenes, se suben y se concatenan
    if (newImgFiles.length > 0) {
      const formData = new FormData();
      newImgFiles.forEach((file) => {
        formData.append("images", file);
      });
      formData.append("num_empleado", num_empleado.toString());
      try {
        console.log("Subiendo nuevas imágenes...");
        const res = await axios.post("/api/uploadImages", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        console.log("Imágenes subidas correctamente:", res.data.imageUrls);
        // Concatenar las imágenes ya existentes con las nuevas subidas
        updatedImages = [...updatedImages, ...res.data.imageUrls];
      } catch (error) {
        console.error("Error al subir nuevas imágenes:", error);
        return;
      }
    }

    // Construir el objeto actualizado con el arreglo completo de imágenes y videoUrl
    const updatedPost = {
      ...post,
      img: updatedImages,
      videoUrl: post.videoUrl || "", // 👈 Aseguramos que se incluya el video
    };

    try {
      const response = await fetch(
        "https://apicursos.in.grupotarahumara.com.mx/ActualizarPost",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedPost),
        }
      );

      if (!response.ok) {
        throw new Error("Error en la solicitud");
      }

      const data = await response.json();
      console.log("Post actualizado:", data);
      setOpenModal(false);
      onPostEdit(updatedPost);
    } catch (error) {
      console.error("Error al actualizar post:", error);
    }
  };

  return (
    <>
      <Card
        className="pt-10"
        shadow={true}
        
{...({} as any)}
      >
        <CardHeader
{...({} as any)}
        >
          <Carousel
            className="rounded-xl"
{...({} as any)}
          >
            {post.videoUrl != "" && (
              <div className="aspect-video w-full h-full">
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${extractYouTubeID(
                    post.videoUrl || ""
                  )}`}
                  title="YouTube video"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            )}
            {post.img.map((imgUrl, index) => (
              <Image
                key={index}
                src={`/api/images/${imgUrl.split("/").pop()}`}
                alt={`Imagen ${index + 1}`}
                width={600}
                height={600}
                className="w-full object-cover "
              />
            ))}
          </Carousel>
        </CardHeader>
        <CardBody
          className="p-6"
{...({} as any)}
        >
          <Typography
            variant="small"
            color="blue"
            className="mb-2 !font-medium"
{...({} as any)}
          >
            {tag}
          </Typography>
          <Typography
{...({} as any)}
            as="a"
            href="#"
            variant="h5"
            color="blue-gray"
            className="mb-2 normal-case transition-colors hover:text-gray-900"
          >
            {title}
          </Typography>
          <Typography
            className="mb-6 font-normal !text-gray-500"
{...({} as any)}
          >
            {desc}
          </Typography>
          <div className="flex items-center gap-4">
            <Avatar
              size="sm"
              variant="circular"
              src={`/fotos/${formattedUserId}.jpg`}
              alt={author.name}
{...({} as any)}
            />
            <div>
              <Typography
                variant="small"
                color="blue-gray"
                className="mb-0.5 !font-medium"
                
{...({} as any)}
              >
                {author.name}
              </Typography>
              <Typography
                variant="small"
                color="gray"
                className="text-xs !text-gray-500 font-normal"
                
{...({} as any)}
              >
                {date}
              </Typography>
            </div>
            {isAuthenticated && (
              <div>
                <Button
                  onClick={() => onPostDelete(idBlog)}
                  
{...({} as any)}
                >
                  Eliminar
                </Button>
                <Button
                  className="ml-auto"
                  onClick={handleEditClick}
                  
{...({} as any)}
                >
                  Editar
                </Button>
              </div>
            )}
            {statusLike ? (
              <IconButton
                
{...({} as any)}
                onClick={() => {
                  fetch(
                    `https://apicursos.in.grupotarahumara.com.mx/dislike/${idBlog}`,
                    {
                      method: "PUT",
                    }
                  )
                    .then((res) => res.json())
                    .then((data) => {
                      console.log(data);
                      setPost((prevPost) => ({
                        ...prevPost,
                        likes: prevPost.likes + 1,
                      }));
                      setStatusLike(!statusLike);
                      onPostEdit({
                        title: title,
                        desc: desc,
                        tag: tag,
                        videoUrl: videoUrl,
                        img: img,
                        likes: likes,
                        idBlog: idBlog,
                        date: date,
                        num_empleado: num_empleado,
                        name_author: author.name,
                        img_author: author.img,
                      });
                    });
                }}
              >
                <i className="fas fa-heart" />
              </IconButton>
            ) : (
              <IconButton
                
{...({} as any)}
                onClick={() => {
                  fetch(
                    `https://apicursos.in.grupotarahumara.com.mx/like/${idBlog}`,
                    {
                      method: "PUT",
                    }
                  )
                    .then((res) => res.json())
                    .then((data) => {
                      console.log(data);
                      setPost((prevPost) => ({
                        ...prevPost,
                        likes: prevPost.likes - 1,
                      }));
                      setStatusLike(!statusLike);
                      onPostEdit(
                        {
                          title: title,
                          desc: desc,
                          tag: tag,
                          videoUrl: videoUrl,
                          img: img,
                          likes: likes,
                          idBlog: idBlog,
                          date: date,
                          num_empleado: num_empleado,
                          img_author: author.img,
                          name_author: author.name,
                        }
                      );
                    });
                }}
              >
                <i className="far fa-heart" />
              </IconButton>
            )}
            {likes}
          </div>
        </CardBody>
      </Card>

      {/* Modal para editar información */}
      <Dialog
        open={openModal}
        handler={handleCloseModal}
        
{...({} as any)}
      >
        <DialogHeader
          {...({} as any)}
        >
          Editar la información
        </DialogHeader>
        <DialogBody
          {...({} as any)}
        >
          <div>
            {/* Campos de edición de texto */}
            <Input
              type="text"
              placeholder="Título"
              value={post.title}
              onChange={(e) => setPost({ ...post, title: e.target.value })}
              className="w-full p-2 border rounded mb-4"
              onPointerEnterCapture={() => {}}
              onPointerLeaveCapture={() => {}}
              crossOrigin=""
            />
            <Input
              placeholder="Descripción"
              value={post.desc}
              onChange={(e) => setPost({ ...post, desc: e.target.value })}
              className="w-full p-2 border rounded mb-4"
              onPointerEnterCapture={() => {}}
              onPointerLeaveCapture={() => {}}
              crossOrigin=""
            />
            <Input
              type="text"
              placeholder="Tag"
              value={post.tag}
              onChange={(e) => setPost({ ...post, tag: e.target.value })}
              className="w-full p-2 border rounded mb-4"
              onPointerEnterCapture={() => {}}
              onPointerLeaveCapture={() => {}}
              crossOrigin=""
            />
            <Input
              type="text"
              placeholder="Enlace de YouTube"
              value={post.videoUrl || ""}
              onChange={(e) => setPost({ ...post, videoUrl: e.target.value })}
              className="w-full p-2 border rounded mb-4"
              onPointerEnterCapture={() => {}}
              onPointerLeaveCapture={() => {}}
              crossOrigin=""
            />

            {/* Sección para editar imágenes */}
            <div className="mb-4">
              <Typography
                variant="small"
                color="blue-gray"
                className="mb-2"
                
{...({} as any)}
              >
                Imágenes actuales:
              </Typography>
              <div className="flex flex-wrap gap-2">
                {post.img.map((imgUrl, index) => (
                  <div key={index} className="relative">
                    <Image
                      src={`/api/images/${imgUrl.split("/").pop()}`}
                      alt={`Imagen ${index + 1}`}
                      width={100}
                      height={100}
                      className="object-cover rounded"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <Typography
                variant="small"
                color="blue-gray"
                className="mb-2"
                
{...({} as any)}
              >
                Agregar nuevas imágenes:
              </Typography>
              <Input
                crossOrigin=""
                type="file"
                multiple
                onChange={(e) => {
                  if (e.target.files) {
                    setNewImgFiles(Array.from(e.target.files));
                  }
                }}
                className="w-full p-2 border rounded"
{...({} as any)}
              />
            </div>
          </div>
        </DialogBody>
        <DialogFooter
{...({} as any)}
        >
          <Button
            variant="text"
            color="red"
            onClick={handleCloseModal}
{...({} as any)}
          >
            Cerrar
          </Button>
          <Button
            variant="gradient"
            onClick={handleEdit}
{...({} as any)}
          >
            Guardar
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}

export default BlogPostCard;
