/* eslint-disable react/no-unescaped-entities */
import 'katex/dist/katex.min.css'
import KatexSpan from '@/components/KatexSpan'
import Image from 'next/image'
import InteractiveDemo from '@/components/InteractiveDemo'
import pca_plot_flux from '@/public/pca_explained_variance_per_comp_flux.png'
import tilt_variation from '@/public/exploring_z3.png'
import vae_banner from '@/public/vae_banner.jpg'
import Link from 'next/link'
export default function VAEPost() {
  return (
    <>
      {/* Full-width hero section */}
      <div className="relative w-full h-[40vh] mb-16 mx-auto">
          <Image
              src={vae_banner}
              alt="Abstract visualization of a VAE's latent space"
              fill
              className="object-cover"
              priority
            />
        {/* Overlay content */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background">
          <div className="max-w-4xl mx-auto px-4 h-full flex flex-col justify-end pb-16">
            <h1 className="text-[64px] leading-tight font-semibold text-center md:text-[64px] text-3xl">
              What the F*** is a VAE?
            </h1>
            <time 
              dateTime="2024-03-23" 
              className="text-muted-foreground mt-4 text-center block"
            >
              January 23, 2025
            </time>

          </div>
        </div>
      </div>
    <article className="container mx-auto px-4 py-8 prose prose-lg dark:prose-invert max-w-4xl prose-img:mx-auto prose-img:w-full">

      <p>
        Part of my role as CTO of <Link href="https://remade.ai">Remade AI</Link> is working on diffusion models, the new generation of which are Latent Diffusion Models (LDMs). 
        These models operate in a compressed latent space and VAEs are the things that do the "compressing" and "decompressing." An interesting byproduct of working with such models is that my cofounders have often found me in the office at 2am staring at the screen
        muttering to myself "What the F*** is a VAE?" This blog post is my attempt to answer that question!
      </p>
      
      <h2>What are Autoencoders?</h2>

      <p>
        An <strong>autoencoder</strong> is a type of neural network that learns to reconstruct its input data <KatexSpan text="\mathbf{x}" inline />. 
        It has two main components:
      </p>

      <ul>
        <li>
          <strong>Encoder</strong> (<KatexSpan text="f_{\theta}" inline />): Compresses <KatexSpan text="\mathbf{x} \in \mathbb{R}^d" inline /> into 
          a lower-dimensional latent representation <KatexSpan text="\mathbf{z} \in \mathbb{R}^k" inline />, where typically <KatexSpan text="k \ll d" inline />.
          <KatexSpan text="\mathbf{z} = f_{\theta}(\mathbf{x})" className="my-4" />
        </li>
        <li>
          <strong>Decoder</strong> (<KatexSpan text="g_{\phi}" inline />): Reconstructs (or "decodes") the latent vector <KatexSpan text="\mathbf{z}" inline /> back 
          into <KatexSpan text="\hat{\mathbf{x}}" inline />, an approximation of the original input.
          <KatexSpan text="\hat{\mathbf{x}} = g_{\phi}(\mathbf{z})" className="my-4" />
        </li>
      </ul>

      <p>Putting it all together, a forward pass through the autoencoder typically looks like:</p>

      <KatexSpan 
        text="\mathbf{x} \;\;\longrightarrow\;\; f_{\theta}(\mathbf{x}) \;=\; \mathbf{z} \;\;\longrightarrow\;\; g_{\phi}(\mathbf{z}) \;=\; \hat{\mathbf{x}}"
        className="my-4"
      />

      <p>
        During training, we want <KatexSpan text="\hat{\mathbf{x}}" inline /> to be as close as possible to <KatexSpan text="\mathbf{x}" inline />. 
        A common way to measure the difference between <KatexSpan text="\mathbf{x}" inline /> and <KatexSpan text="\hat{\mathbf{x}}" inline /> is 
        through a <strong>mean squared error (MSE)</strong> loss:
      </p>

      <KatexSpan 
        text="\mathcal{L}_{\text{recon}}(\mathbf{x}, \hat{\mathbf{x}}) \;=\; \|\mathbf{x} \;-\; \hat{\mathbf{x}}\|^2"
        className="my-4"
      />

      <p>
        Hence, the autoencoder is typically trained by minimizing the sum of these reconstruction losses across all data points:
      </p>

      <KatexSpan 
        text="\min_{\theta, \phi} \;\sum_{i=1}^{N} \mathcal{L}_{\text{recon}}\!\Bigl(\mathbf{x}^{(i)}, \,\hat{\mathbf{x}}^{(i)}\Bigr)"
        className="my-4"
      />

      <p>
        where <KatexSpan text="\theta" inline /> and <KatexSpan text="\phi" inline /> are the parameters of the encoder and decoder, respectively, 
        and <KatexSpan text="N" inline /> is the number of training samples.
      </p>

      <p>
        Because the latent dimension <KatexSpan text="k" inline /> is strictly less than the input dimension <KatexSpan text="d" inline />, 
        the network is forced to learn a compressed representation of the data. This process:
      </p>

      <ul>
        <li>
          <strong>Encourages dimensionality reduction:</strong> The encoder-decoder structure is somewhat analogous to a learned, 
          potentially <em>nonlinear</em> version of principal component analysis (PCA).
        </li>
        <li>
          <strong>Extracts features:</strong> The latent code <KatexSpan text="\mathbf{z}" inline /> often captures relevant factors 
          of variation in the data.
        </li>
      </ul>

      <p>
        However, classic autoencoders mainly focus on <em>reconstruction</em> and do not impose structure 
        on <KatexSpan text="\mathbf{z}" inline /> to enable <em>generation</em> of new data from scratch. To address this, 
        we introduce a <em>probabilistic</em> perspective on the latent space in the <strong>variational autoencoder (VAE)</strong>, 
        ensuring a smoother and more meaningful latent distribution suitable for generative modeling.
      </p>
      <figure className='my-0'>
        <div className="relative w-full aspect-video">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="object-contain w-full h-full"
            >
            <source src="https://i.imgur.com/yEM68kU.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
        <figcaption className="text-center mt-2 text-sm text-muted-foreground">
          <strong>Figure 1:</strong> Training visualization of an autoencoder on MNIST digits: Original images (top) and their reconstructions (bottom) are shown, along with the training loss curve over 100 epochs.
        </figcaption>
      </figure>

      <h2 className="text-2xl font-bold mt-8 mb-4">Variational Autoencoders (VAEs)</h2>

      <p>
        A <strong>variational autoencoder</strong> (<strong>VAE</strong>) can be understood as a <em>latent variable model</em> with 
        a probabilistic framework over both <em>observed</em> data <KatexSpan text="\mathbf{x}" inline /> and <em>hidden</em> (latent) 
        variables <KatexSpan text="\mathbf{z}" inline />. Instead of deterministically mapping <KatexSpan text="\mathbf{x}" inline /> to 
        a single point <KatexSpan text="\mathbf{z}" inline />, a VAE places a <em>distribution</em> over <KatexSpan text="\mathbf{z}" inline /> conditioned on <KatexSpan text="\mathbf{x}" inline /> and imposes a prior distribution on <KatexSpan text="\mathbf{z}" inline /> itself.
      </p>

      <p>
        We assume our data <KatexSpan text="\mathbf{x}" inline /> (e.g., images) are generated by a two-step probabilistic process:
      </p>

      <KatexSpan 
        text="\mathbf{z} \sim p(\mathbf{z}), \quad \mathbf{x} \sim p_{\theta}(\mathbf{x}\mid\mathbf{z})"
        className="my-4"
      />

      <p>where:</p>
      <ul>
        <li>
          <KatexSpan text="p(\mathbf{z})" inline /> is the <strong>prior</strong> over latent variables. Commonly, <KatexSpan text="p(\mathbf{z})" inline /> is 
          chosen to be a simple Gaussian <KatexSpan text="\mathcal{N}(\mathbf{0}, \mathbf{I})" inline />.
        </li>
        <li>
          <KatexSpan text="p_{\theta}(\mathbf{x}\mid\mathbf{z})" inline /> is the <strong>likelihood model</strong> (<em>decoder</em>), 
          parameterized by <KatexSpan text="\theta" inline /> (e.g., a neural network).
        </li>
      </ul>

      <p>Hence, the <em>joint</em> distribution factorizes as:</p>

      <KatexSpan 
        text="p_{\theta}(\mathbf{x}, \mathbf{z}) \;=\; p_{\theta}(\mathbf{x}\mid \mathbf{z})\, p(\mathbf{z})"
        className="my-4"
      />

      <p>
        We are often interested in the <em>posterior</em> distribution <KatexSpan text="p(\mathbf{z}\mid\mathbf{x})" inline />, i.e. how 
        the latent <KatexSpan text="\mathbf{z}" inline /> is <em>distributed</em> once we have observed 
        data <KatexSpan text="\mathbf{x}" inline />. By Bayes' rule:
      </p>

      <KatexSpan 
        text="p(\mathbf{z}\mid\mathbf{x}) \;=\; \frac{p_{\theta}(\mathbf{x}\mid\mathbf{z})\, p(\mathbf{z})}{p(\mathbf{x})}"
        className="my-4"
      />

      <p>
        but <KatexSpan text="p(\mathbf{x})" inline /> (the <em>evidence</em>) involves an integral over all 
        possible <KatexSpan text="\mathbf{z}" inline />:
      </p>

      <KatexSpan 
        text="p(\mathbf{x}) \;=\;\int p_{\theta}(\mathbf{x}\mid\mathbf{z}) \,p(\mathbf{z}) \,d\mathbf{z}"
        className="my-4"
      />

      <p>which is typically intractable for high-dimensional or richly-parameterized neural networks.</p>

      <p>
        To circumvent this, we introduce a tractable <em>approximation</em> <KatexSpan text="q_{\phi}(\mathbf{z}\mid\mathbf{x})" inline />, 
        where <KatexSpan text="\phi" inline /> are the variational parameters (often another neural network, sometimes called 
        the <em>encoder</em>). We want <KatexSpan text="q_{\phi}(\mathbf{z}\mid\mathbf{x})" inline /> to be "as close as possible" to 
        the true posterior <KatexSpan text="p_{\theta}(\mathbf{z}\mid\mathbf{x})" inline />.
      </p>

      <p>
        A standard choice is to let <KatexSpan text="q_{\phi}(\mathbf{z}\mid\mathbf{x})" inline /> be a Gaussian 
        (e.g. <KatexSpan text="\mathcal{N}(\boldsymbol{\mu}(\mathbf{x}), \mathbf{\Sigma}(\mathbf{x}))" inline />), 
        whose mean and (diagonal) covariance come from a neural network.
      </p>

      <h3 className="text-xl font-semibold mt-6 mb-3">Learning by Maximizing the Evidence Lower Bound (ELBO)</h3>

      <p>We define the <em>variational lower bound</em> (ELBO) on <KatexSpan text="\log p_{\theta}(\mathbf{x})" inline />:</p>

      <KatexSpan 
        text="\log p_{\theta}(\mathbf{x}) \;\;\ge\;\; \underbrace{\,\mathbb{E}_{q_{\phi}(\mathbf{z}\mid\mathbf{x})}\bigl[\log p_{\theta}(\mathbf{x}\mid \mathbf{z})\bigr] \;-\; D_{\mathrm{KL}}\!\bigl(q_{\phi}(\mathbf{z}\mid\mathbf{x}) \,\|\, p(\mathbf{z})\bigr)\,}_{\text{ELBO}(\theta,\phi,\mathbf{x})}"
        className="my-4"
      />

      <p>Thus, the <strong>VAE objective</strong> is:</p>

      <KatexSpan 
        text="\max_{\theta, \phi} \bigl\{\text{ELBO}(\theta, \phi)\bigr\} \;=\; \max_{\theta, \phi} \Bigl\{ \mathbb{E}_{q_{\phi}(\mathbf{z}\mid\mathbf{x})}\bigl[\log p_{\theta}(\mathbf{x}\mid\mathbf{z})\bigr] \;-\; D_{\mathrm{KL}}\!\bigl(q_{\phi}(\mathbf{z}\mid\mathbf{x}),\, p(\mathbf{z})\bigr) \Bigr\}"
        className="my-4"
      />

      <p>By optimizing this <em>lower bound</em>, we simultaneously:</p>
      <ul>
        <li>
          <strong>Maximize reconstruction quality</strong> (the first term, <KatexSpan text="\mathbb{E}[\log p_{\theta}(\mathbf{x}\mid\mathbf{z})]" inline />)
        </li>
        <li>
          <strong>Regularize the latent space</strong> (the second term, the KL divergence to a simple prior)
        </li>
      </ul>

      <p>With a <em>well-regularized</em> latent space, we can sample new data by:</p>

      <KatexSpan 
        text="\mathbf{z}^{(\text{new})} \sim p(\mathbf{z}) \quad\Rightarrow\quad \hat{\mathbf{x}}^{(\text{new})} = p_{\theta}(\mathbf{x}\mid \mathbf{z}^{(\text{new})})"
        className="my-4"
      />

      <p>
        thus generating novel outputs in the data space. This property makes VAEs a <em>powerful</em> approach 
        for <strong>generative modeling</strong>—each latent vector <KatexSpan text="\mathbf{z}^{(\text{new})}" inline /> decodes 
        into a coherent sample <KatexSpan text="\hat{\mathbf{x}}^{(\text{new})}" inline />.
      </p>
      <figure className='my-8'>
        <div className="relative w-full aspect-video">
          <video
            className="w-full"
            autoPlay
            loop
            muted
            playsInline
          >
            <source src="https://i.imgur.com/Gxz5m9L.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
        <figcaption className="text-center mt-2 text-sm text-muted-foreground">
          <strong>Figure 2:</strong> Visualization of latent space interpolation in a VAE. Points <KatexSpan text="z_i" inline /> and <KatexSpan text="z_e" inline /> represent the initial and end states 
          in the latent space, while <KatexSpan text="z_I" inline /> shows the current interpolation point. As <KatexSpan text="z_I" inline /> moves along the path between <KatexSpan text="z_i" inline /> and <KatexSpan text="z_e" inline />, 
          the decoder generates corresponding images, demonstrating smooth transitions between learned representations.
        </figcaption>
      </figure>

      <h2>Disentangled VAEs (and Why We Care)</h2>

        <p>
        A <strong>disentangled</strong> variational autoencoder aims for each latent dimension (or a small subset thereof) to correspond to 
        a single factor of variation in your dataset. In other words, we'd love each axis in <KatexSpan text="\mathbf{z}" inline /> to 
        capture a different interpretable property, for example line thickness or tilt, without mixing those properties 
        in the same dimension.
        </p>


        <p>
        In an ideal <em>disentangled</em> latent space, we might see that a few principal axes 
        explain most of the variance near an encoded point <KatexSpan text="\mathbf{z}_0" inline />. 
        But in practice, the <strong>Flux VAE</strong>, 
        we observe from <strong>Figure 3</strong> that the <em>cumulative explained variance</em> follows a logarithmic-like climb, 
        implying no single dimension (or handful of them) dominates.
        </p>
        <p>
        Since the curve has no clear "elbow," it suggests these latent spaces 
        are <em>quite entangled</em> e.g. the variance is spread out, with no single direction 
        accounting for a big chunk of variation.
        </p>

        <figure>
          <div className="relative w-full aspect-video">
            <Image
              src={pca_plot_flux}
              alt="PCA explained variance ratio for FLUX VAE"
              fill
              className="object-contain"
              unoptimized
              priority
            />
          </div>
        <figcaption className="text-center mt-2 text-sm text-muted-foreground">
            <strong>Figure 3:</strong> Cumulative PCA explained variance for the <em>Flux VAE</em>. 
            The curve shows a smooth, log-like rise—no single dimension stands out as a clear principal component.
        </figcaption>
        </figure>

        <p>
        To visualize whether certain directions in latent space produce 
        coherent changes, we took the top 5 PCA components from that local neighborhood 
        and <em>stepped</em> along each direction. 
        Then, for each step in these directions, we <em>decode</em> back to image space.
        </p>

        <p>
        The <strong>Flux VAE</strong> shows somewhat "random" or "flickering" transformations. 
        In <strong>Figure 4</strong> (the accompanying GIF), the reconstructions 
        look mostly like noise or small chaotic changesindicating these latent 
        directions do <strong>not</strong> correspond to a single factor (e.g., shape or color). 
        </p>

        <figure>
        <div className="relative w-full h-48">
            <video
            autoPlay
            loop
            muted
            playsInline
            className="object-contain w-full h-full"
            >
            <source src="https://i.imgur.com/mTbKKD2.mp4" type="video/mp4" />
            Your browser does not support the video tag.
            </video>
        </div>
        <figcaption className="text-center mt-2 text-sm text-muted-foreground">
            <strong>Figure 4:</strong> GIF stepping along top 5 PCA directions near an encoded image 
            in the <em>FLUX VAE</em>, producing pseudo-random variation 
            rather than a clear, single-factor transformation.
        </figcaption>
        </figure>

        <h3>Conditioned Beta-VAE (on MNIST)</h3>

        <p>
        We can still find ways to <em>achieve</em> partial disentanglement, 
        especially on simpler or labeled data. Below is an <em>interactive demo</em> of a <strong>Conditioned Beta-VAE</strong> trained on the MNIST dataset:
        </p>

        <ul>
        <li>
            "<strong>Conditioned</strong>" means we feed the digit class label <KatexSpan text="y" inline /> along
            with the image <KatexSpan text="\mathbf{x}" inline /> into the encoder and decoder. 
            This helps the VAE to separate label-driven variation from other variation.
        </li>
        <li>
            "<strong>Beta</strong>" means we scale the KL term by <KatexSpan text="\beta" inline />, 
            pushing the model to compress the representation more aggressively and (hopefully) 
            isolate distinct factors in separate latent dims.
        </li>
        </ul>

        <p>
        Mathematically, the <em>Conditioned Beta-VAE</em> modifies the usual VAE objective. If we denote 
        the data-label pair as <KatexSpan text="(\mathbf{x}, y)" inline />, and the latent 
        as <KatexSpan text="\mathbf{z}" inline />, we have:
        </p>

        <KatexSpan 
        text="\begin{aligned}
        \mathcal{L}_{\beta}(\theta, \phi) 
        &= \mathbb{E}_{q_{\phi}(\mathbf{z} \mid \mathbf{x}, y)}\bigl[\log p_{\theta}(\mathbf{x}\mid \mathbf{z}, y)\bigr] 
        \;-\; \beta \,\mathrm{KL}\!\Bigl( q_{\phi}(\mathbf{z}\mid \mathbf{x}, y) \;\|\; p(\mathbf{z}) \Bigr) \,.
        \end{aligned}"
        className="my-4"
        />

        <p>
        Here, <KatexSpan text="q_{\phi}(\mathbf{z}\mid \mathbf{x}, y)" inline /> is the 
        encoder distribution (mean &amp; log-variance come from a neural net 
        that sees both <KatexSpan text="\mathbf{x}" inline /> and label <KatexSpan text="y" inline />). 
        Similarly, the decoder <KatexSpan text="p_{\theta}(\mathbf{x}\mid\mathbf{z}, y)" inline /> can 
        incorporate the class label as an additional input. 
        </p>

        <p>
        We set <KatexSpan text="\beta" inline /> to some value &gt; 1 to further encourage 
        the distribution over <KatexSpan text="\mathbf{z}" inline /> to stay close to a 
        factorized Gaussian prior, 
        yielding <em>disentangled</em> latents <em>if</em> the data factors are suitable.
        </p>

        <figure>
          <div className="relative w-full h-48">
          <Image
            src={tilt_variation}
            alt="Varying dimension 3 of the latent space shows tilt variation"
              fill
              className="object-contain"
              unoptimized
              priority
            />
          </div>
          <figcaption className="text-center mt-2 text-sm text-muted-foreground">
            <strong>Figure 5:</strong> Varying dimension 3 of the latent vector shows clear tilt variation in the generated digits,
            while other attributes remain relatively constant.
          </figcaption>
        </figure>

        <p>
        The demo below runs entirely client-side using ONNX Runtime Web. I first trained the model in PyTorch, saved it 
        as a safetensors checkpoint, then converted it to ONNX format using <code>torch.onnx.export</code>. 
        The resulting ONNX model is loaded directly in the browser via onnxruntime-web, which provides efficient 
        inference without any server calls. When you interact with the demo, dimension #3 of the latent space 
        shows clear control over the digit's tilt - a nice example of disentanglement!
        </p>
        
        <figure>
        <div className="relative w-full aspect-video">
          <InteractiveDemo />

        </div>
        <figcaption className="text-center mt-2 text-sm text-muted-foreground">
            <strong>Figure 6:</strong> Interactive Conditioned Beta-VAE on MNIST. 
            You can pick a digit label and vary dimension #3 of <KatexSpan text="\mathbf{z}" inline />, 
            which rotates the digit. <em>One dimension, one factor.</em>
        </figcaption>
        </figure>

        <h3>Disentangled Latent Spaces and Diffusion Models</h3>

        <p>
        <em>Latent diffusion models</em> (LDMs) run the diffusion process in a compressed latent space 
        rather than raw pixels. If that latent space is <strong>disentangled</strong>, 
        the diffusion process can manipulate distinct factors more easily. For instance:
        </p>

        <ul>
        <li>
            The diffusion model might add noise along a specific dimension that 
            strictly corresponds to "stroke thickness," letting you generate new samples 
            with controlled variation of that factor.
        </li>
        <li>
            A <strong>structured</strong> latent space often allows <em>fewer steps</em> or 
            easier sampling, as the factors are not entangled in complex ways the model 
            has to "untangle."
        </li>
        </ul>

        <p>
        That said, <strong>training-time trade-offs</strong> arise. Pushing for disentanglement 
        (often via a bigger <KatexSpan text="\beta" inline />) 
        can increase the model's complexity, slow down training, and 
        sometimes degrade raw reconstruction quality. 
        But if the final goal is a stable, controllable latent space (like for LDMs), 
        it might be worth the extra training overhead. 
        </p>

        <p>
        In short, a <em>well-disentangled VAE</em> helps us push the diffusion process 
        into a more interpretable and manipulable domain enabling easy factor-specific 
        editing or exploration. Of course, in large real-world datasets (like images from 
        the web), achieving full disentanglement is tricky. But even partial disentanglement, 
        as shown in our MNIST or toy examples, can significantly improve the <em>user control</em> and <em>semantic clarity</em> of generative pipelines.
        </p>
        <h3>References</h3>

        <ul>
            <li>
                <a href="https://github.com/aguerrerolopez/FA-VAE" target="_blank" rel="noopener noreferrer">
                    Multi-view hierarchical Variational AutoEncoders with Factor Analysis latent space.
                </a>
            </li>
            <li>
                <a href="https://openaccess.thecvf.com/content_CVPR_2019/papers/Rolinek_Variational_Autoencoders_Pursue_PCA_Directions_by_Accident_CVPR_2019_paper.pdf" target="_blank" rel="noopener noreferrer">
                    Variational Autoencoders Pursue PCA Directions (by Accident).
                </a>

            </li>
            <li>
                <a href="https://github.com/YannDubs/disentangling-vae" target="_blank" rel="noopener noreferrer">
                    Disentangling VAE: Experiments for understanding disentanglement in VAE latent representations.
                </a>

            </li>
            <li>
                <a href="https://arxiv.org/pdf/1802.05983" target="_blank" rel="noopener noreferrer">
                    Disentangling by Factorising: A method that improves upon β-VAE by encouraging factorial latent representations.
                </a>
            </li>
            <li>
                <a href="https://arxiv.org/pdf/1812.02833" target="_blank" rel="noopener noreferrer">
                    Disentangling Disentanglement in Variational Autoencoders: A unified theoretical framework for analyzing and improving representations.
                </a>
            </li>
            <li>
                <a href="https://medium.com/swlh/learning-disentangled-representations-with-variational-autoencoders-b1bfe237fffb" target="_blank" rel="noopener noreferrer">
                    Learning Disentangled Representations with Variational Autoencoders: A comprehensive overview of VAEs and disentanglement.
                </a>
            </li>
        </ul>

    </article>
    </>
  )
}
